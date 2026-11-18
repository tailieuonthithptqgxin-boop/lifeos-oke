import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, Heart, Utensils, Award, X, Settings, 
  ChevronUp, ChevronDown, Check, Volume2, Shield, Flame
} from 'lucide-react';
import { petApi, UserPet } from '../../lib/petApiClient';
import { soundEngine } from '../../lib/soundEngine';
import { toast } from '../../lib/toast';
import { LiveMascotCharacter } from '../companion/LiveMascotCharacter';

export interface FocusPetWidgetProps {
  embedded?: boolean;
  studyContext?: {
    isRunning?: boolean;
    timerStatus?: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | string;
    title?: string;
  };
  className?: string;
}

const CHEER_QUOTES_RUNNING = [
  'Đang vào flow rồi, cố lên bạn ơi! Tui canh chừng distractions cho nè! 🎧',
  'Tập trung siêu đỉnh! Mỗi phút học là một bước tiến đến đỉnh cao! 🚀',
  'Giữ vững phong độ nha! Học chăm tui thưởng nhiều cà rốt 🥕 nè!',
  'Bé luôn ở đây đồng hành và cổ vũ bạn nè, cố lên nào! ✨',
  'Tắt mạng xã hội đi, mình cùng nhau chinh phục mục tiêu hôm nay nhé! 🔥'
];

const CHEER_QUOTES_PAUSED = [
  'Tạm dừng một xíu uống ngụm nước ấm rồi quay lại chiến tiếp nha! 💧',
  'Hít thở sâu 3 giây rồi nạp lại năng lượng nào! 🌿'
];

const CHEER_QUOTES_COMPLETED = [
  'Đỉnh chóp luôn! Chúc mừng bạn đã hoàn thành trọn vẹn phiên học! 🎉 Tặng bạn cà rốt 🥕!',
  'Tuyệt vời ông mặt trời! Thành tích xuất sắc, xứng đáng nhận tràng pháo tay! 👏',
  'Phiên học hoàn thành mĩ mãn! Thả lỏng mắt và nghỉ xả hơi một chút thôi! 🍵'
];

export function FocusPetWidget({ embedded = false, studyContext, className = '' }: FocusPetWidgetProps = {}) {
  const [pet, setPet] = useState<UserPet | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isEating, setIsEating] = useState(false);

  useEffect(() => {
    loadPet();
    const timer = setInterval(loadPet, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadPet = async () => {
    try {
      const data = await petApi.getPet();
      setPet(data);
    } catch {
      // Ignore if offline
    }
  };

  // Dynamic cheering dialogue based on study context
  const activeDialogue = useMemo(() => {
    if (!pet) return '';
    if (studyContext?.timerStatus === 'COMPLETED') {
      return CHEER_QUOTES_COMPLETED[Math.floor(Math.random() * CHEER_QUOTES_COMPLETED.length)];
    }
    if (studyContext?.timerStatus === 'PAUSED') {
      return CHEER_QUOTES_PAUSED[Math.floor(Math.random() * CHEER_QUOTES_PAUSED.length)];
    }
    if (studyContext?.isRunning || studyContext?.timerStatus === 'RUNNING') {
      return CHEER_QUOTES_RUNNING[Math.floor(Math.random() * CHEER_QUOTES_RUNNING.length)];
    }
    return pet.dialogue || 'Bé luôn ở đây cổ vũ bạn học tập và làm việc mỗi ngày! 💖';
  }, [pet, studyContext?.isRunning, studyContext?.timerStatus]);

  const handleFeed = async () => {
    if (!pet || loading) return;
    if (pet.foodCount <= 0) {
      soundEngine.playBell();
      toast.show('Hết thức ăn rồi bạn ơi! Hãy học bài hoặc hoàn thành task để nhận cà rốt 🥕', 'error');
      return;
    }

    try {
      setLoading(true);
      setIsEating(true);
      soundEngine.playPop();

      const res = await petApi.feed();
      setPet(res.pet);

      if (res.leveledUp) {
        soundEngine.playLevelUpFanfare();
        toast.show(res.message, 'success');
      } else {
        toast.show(res.message, 'success');
      }

      setTimeout(() => setIsEating(false), 1200);
    } catch (err: any) {
      toast.show(err.message || 'Lỗi cho ăn', 'error');
      setIsEating(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePet = async (e: React.MouseEvent) => {
    if (!pet || loading) return;
    try {
      soundEngine.playPop();
      
      const rect = e.currentTarget.getBoundingClientRect();
      const newHeart = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setHearts(prev => [...prev.slice(-4), newHeart]);
      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 1000);

      const res = await petApi.pet();
      setPet(res.pet);
      toast.show(res.dialogue, 'info');
    } catch {
      // Non-blocking
    }
  };

  const handleRename = async () => {
    if (!editingName.trim()) return;
    try {
      const updated = await petApi.rename(editingName.trim());
      setPet(updated);
      toast.show('Đã đổi tên linh vật thành công!', 'success');
    } catch (err: any) {
      toast.show(err.message || 'Lỗi đổi tên', 'error');
    }
  };

  const handleCustomize = async (type: string, skin: string) => {
    try {
      soundEngine.playSuccess();
      const updated = await petApi.customize(type, skin);
      setPet(updated);
      toast.show('Đã cập nhật ngoại hình bạn đồng hành!', 'success');
    } catch (err: any) {
      toast.show(err.message || 'Lỗi cập nhật', 'error');
    }
  };

  if (!pet) return null;

  const expPercent = Math.min(100, Math.round((pet.exp / pet.nextLevelExp) * 100));

  // Render Sprite helper
  const renderMascotSprite = () => {
    const petType = (pet.type || 'CAPYBARA').toUpperCase();

    if (petType === 'LUMI') {
      return (
        <div className="w-24 h-24 flex items-center justify-center">
          <LiveMascotCharacter
            mascotId="lumi"
            mood={isEating ? 'celebrate' : pet.mood === 'SLEEPING' ? 'resting' : studyContext?.isRunning ? 'focus' : 'idle'}
            size="compact"
            equippedAccessoryId={pet.equippedSkin}
            showAura={true}
          />
        </div>
      );
    }

    if (petType === 'KITSU') {
      return (
        <div className="w-24 h-24 flex items-center justify-center">
          <LiveMascotCharacter
            mascotId="fox"
            mood={isEating ? 'celebrate' : pet.mood === 'SLEEPING' ? 'resting' : studyContext?.isRunning ? 'focus' : 'idle'}
            size="compact"
            equippedAccessoryId={pet.equippedSkin}
            showAura={true}
          />
        </div>
      );
    }

    if (petType === 'CAPYBARA' || pet.name.toLowerCase().includes('capy')) {
      return (
        <div className="w-24 h-24 flex items-center justify-center">
          <LiveMascotCharacter
            mascotId="capybara"
            mood={isEating ? 'celebrate' : pet.mood === 'SLEEPING' ? 'resting' : studyContext?.isRunning ? 'focus' : 'idle'}
            size="compact"
            equippedAccessoryId={pet.equippedSkin}
            showAura={true}
          />
        </div>
      );
    }

    if (petType === 'CAT') {
      return (
        <div className="w-24 h-24 flex items-center justify-center">
          <LiveMascotCharacter
            mascotId="cat"
            mood={isEating ? 'celebrate' : pet.mood === 'SLEEPING' ? 'resting' : studyContext?.isRunning ? 'focus' : 'idle'}
            size="compact"
            equippedAccessoryId={pet.equippedSkin}
            showAura={true}
          />
        </div>
      );
    }

    if (petType === 'SHIBA') {
      return (
        <div className="w-24 h-24 flex items-center justify-center">
          <LiveMascotCharacter
            mascotId="bear"
            mood={isEating ? 'celebrate' : pet.mood === 'SLEEPING' ? 'resting' : studyContext?.isRunning ? 'focus' : 'idle'}
            size="compact"
            equippedAccessoryId={pet.equippedSkin}
            showAura={true}
          />
        </div>
      );
    }

    // Default: Capybara vector mascot
    return (
      <div className="w-24 h-24 flex items-center justify-center">
        <LiveMascotCharacter
          mascotId="capybara"
          mood={isEating ? 'celebrate' : pet.mood === 'SLEEPING' ? 'resting' : studyContext?.isRunning ? 'focus' : 'idle'}
          size="compact"
          equippedAccessoryId={pet.equippedSkin}
          showAura={true}
        />
      </div>
    );
  };

  // Content body
  const petContent = (
    <div className={`relative ${embedded ? 'w-full' : 'w-64'} bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm transition-all select-none`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
            LV.{pet.level}
          </span>
          <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[120px]">
            {pet.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
            Bạn cổ vũ 💖
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingName(pet.name);
              setShowModal(true);
            }}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Đổi nhân vật & phụ kiện"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {!embedded && (
            <>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Thu nhỏ ra góc"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cheering Speech Bubble */}
      <div className="relative mb-3 p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
        <span>{activeDialogue}</span>
        <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-slate-100/90 dark:bg-slate-800/90 border-r border-b border-slate-200/50 dark:border-slate-700/50 rotate-45" />
      </div>

      {/* Interactive Mascot Stage */}
      <div 
        onClick={handlePet}
        className="relative h-28 rounded-2xl bg-gradient-to-b from-amber-500/5 via-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
        title="Nhấp vào để xoa đầu bạn đồng hành!"
      >
        {/* Floating Hearts Animation */}
        {hearts.map(h => (
          <span
            key={h.id}
            className="absolute text-rose-500 pointer-events-none animate-bounce text-sm"
            style={{ left: h.x, top: h.y }}
          >
            ❤️
          </span>
        ))}

        {/* Sprite */}
        <div className={`relative transition-transform duration-200 ${isEating ? 'scale-110' : 'group-hover:scale-105'}`}>
          {renderMascotSprite()}
        </div>

        <span className="text-[10px] text-slate-400 mt-1 font-medium group-hover:text-emerald-500 transition-colors">
          Chạm để xoa đầu • +5 vui vẻ
        </span>
      </div>

      {/* Stats & Actions */}
      {(isExpanded || embedded) && (
        <div className="mt-3 space-y-2.5">
          {/* Exp Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>EXP Học Tập</span>
              <span className="font-mono">{pet.exp} / {pet.nextLevelExp} ({expPercent}%)</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${expPercent}%` }}
              />
            </div>
          </div>

          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/70">
              <span className="text-slate-500 flex items-center gap-1">🥣 Độ no:</span>
              <span className={`font-bold ${pet.hunger < 30 ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`}>
                {pet.hunger}/100
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/70">
              <span className="text-slate-500 flex items-center gap-1">💖 Vui vẻ:</span>
              <span className="font-bold text-rose-500">
                {pet.happiness}/100
              </span>
            </div>
          </div>

          {/* Action Button: Cho ăn */}
          <div className="pt-0.5">
            <button
              type="button"
              disabled={loading || pet.foodCount <= 0}
              onClick={handleFeed}
              className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                pet.foodCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Thưởng cà rốt (🥕 {pet.foodCount})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        <div className={`select-none ${className}`}>
          {petContent}
        </div>
      ) : isMinimized ? (
        <div className="fixed bottom-24 right-5 z-40 animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 shadow-lg text-xs font-bold text-slate-800 dark:text-slate-100 hover:scale-105 transition-all cursor-pointer group"
          >
            <span className="text-base">{pet.type === 'LUMI' ? '🦉' : pet.type === 'KITSU' ? '🦊' : pet.type === 'CAPYBARA' ? '🍊' : '🐾'}</span>
            <span>{pet.name} (Lv.{pet.level})</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
              🥕 {pet.foodCount}
            </span>
          </button>
        </div>
      ) : (
        <div className="fixed bottom-20 right-4 z-40 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
          {petContent}
        </div>
      )}

      {/* Mascot / Pet Customizer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Chọn Bạn Đồng Hành Cổ Vũ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rename Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Đặt tên cho bạn nhỏ
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editingName}
                  maxLength={30}
                  onChange={e => setEditingName(e.target.value)}
                  placeholder="Ví dụ: Bé Lumi, Cáo Kitsu, Capy..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleRename}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            </div>

            {/* Choose Character Species - Includes Lumi and Kitsu */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Chọn hình dáng nhân vật
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'LUMI', icon: '🦉', label: 'Bé Cú Lumi' },
                  { type: 'KITSU', icon: '🦊', label: 'Cáo Kitsu' },
                  { type: 'CAPYBARA', icon: '🍊', label: 'Capybara' },
                  { type: 'CAT', icon: '🐱', label: 'Mèo Lofi' },
                  { type: 'SHIBA', icon: '🐶', label: 'Shiba' },
                  { type: 'DRAGON', icon: '🐉', label: 'Rồng Con' }
                ].map(spec => (
                  <button
                    key={spec.type}
                    type="button"
                    onClick={() => handleCustomize(spec.type, pet.equippedSkin)}
                    className={`p-2 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                      pet.type === spec.type
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-2xl">{spec.icon}</span>
                    <span className="text-[10px]">{spec.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Accessories & Skins */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Tủ đồ phụ kiện
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'default', icon: '✨', label: 'Mặc định', reqLevel: 1 },
                  { key: 'headphones', icon: '🎧', label: 'Tai nghe', reqLevel: 2 },
                  { key: 'yuzu_hat', icon: '🍊', label: 'Quả Yuzu', reqLevel: 3 },
                  { key: 'wizard', icon: '🧙‍♂️', label: 'Phù thủy', reqLevel: 5 },
                  { key: 'crown', icon: '👑', label: 'Vương miện', reqLevel: 10 }
                ].map(skin => {
                  const unlocked = pet.unlockedSkins.includes(skin.key) || pet.level >= skin.reqLevel;
                  const isEquipped = pet.equippedSkin === skin.key;

                  return (
                    <button
                      key={skin.key}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && handleCustomize(pet.type, skin.key)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                        isEquipped
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                          : unlocked
                          ? 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer'
                          : 'border-dashed border-slate-200 dark:border-slate-800 opacity-40 cursor-not-allowed text-slate-400'
                      }`}
                    >
                      <span className="text-xl">{skin.icon}</span>
                      <span className="text-[10px] truncate max-w-[80px]">
                        {unlocked ? skin.label : `Cấp ${skin.reqLevel}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
