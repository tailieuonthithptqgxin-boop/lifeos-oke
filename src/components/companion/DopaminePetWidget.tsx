import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Flame, Heart, Trophy, Zap, 
  Settings2, Smile, ArrowUpRight, Award, Edit3, Check
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { retentionEngine, RetentionProfile } from '../../lib/retentionEngine';
import { 
  companionEngine, 
  CompanionMascotId, 
  MASCOT_PROFILES, 
  CompanionMood 
} from '../../lib/companionEngine';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { LiveMascotCharacter } from './LiveMascotCharacter';

const GENZ_PET_QUOTES = [
  "Cố lên bạn ơi, bạn đang gánh cả cái ngày hôm nay luôn đấy! ✨",
  "Một task nữa thôi là hóa thần rồi, đừng bỏ cuộc nha! 🔥",
  "Hôm nay bạn siêu ngầu! 10 điểm không có nhưng! 💯",
  "Uống miếng nước rồi tiếp tục cày nào, mình tin bạn làm được! 🥤",
  "Chuỗi Streak cháy quá chừng! Giữ vững phong độ nha bạn iu! 🚀",
  "Không có việc gì khó, chỉ sợ deadline dí! Chiến thôi! ⚡",
  "Tập trung một chút, tối nay đi ngủ không lo âu nhé! 🌙"
];

// 4 Evolutionary Stages based on RPG Level
export interface EvolutionStage {
  stage: number;
  title: string;
  badge: string;
  minLevel: number;
  maxLevel: number;
  desc: string;
  auraColor: string;
}

export const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    stage: 1,
    title: 'Linh Thạch Ngủ Say',
    badge: 'Cấp I · Sơ Sinh 🥚',
    minLevel: 1,
    maxLevel: 4,
    desc: 'Đang ấp ủ tiềm năng qua từng nhiệm vụ đầu tiên',
    auraColor: 'from-amber-400 to-orange-400'
  },
  {
    stage: 2,
    title: 'Bé Mầm Hiếu Học',
    badge: 'Cấp II · Tiến Hóa 🐣',
    minLevel: 5,
    maxLevel: 9,
    desc: 'Đã thức tỉnh, hào hứng theo chân bạn mỗi ngày',
    auraColor: 'from-emerald-400 to-teal-400'
  },
  {
    stage: 3,
    title: 'Chiến Thần Kỷ Luật',
    badge: 'Cấp III · Dũng Sĩ 🦊',
    minLevel: 10,
    maxLevel: 19,
    desc: 'Khai mở kiếm khiên, bảo hộ chuỗi streak rực rỡ',
    auraColor: 'from-indigo-400 to-purple-400'
  },
  {
    stage: 4,
    title: 'Thần Thú Tối Thượng',
    badge: 'Cấp IV · Tối Thượng 🐉',
    minLevel: 20,
    maxLevel: 999,
    desc: 'Hào quang cực đại, đã đạt cảnh giới làm chủ cuộc đời',
    auraColor: 'from-rose-400 via-amber-400 to-emerald-400'
  }
];

export function getEvolutionStage(level: number): EvolutionStage {
  if (level >= 20) return EVOLUTION_STAGES[3];
  if (level >= 10) return EVOLUTION_STAGES[2];
  if (level >= 5) return EVOLUTION_STAGES[1];
  return EVOLUTION_STAGES[0];
}

export function DopaminePetWidget() {
  const { currentUser, tasks = [] } = useAppStore();
  const userId = currentUser?.id;

  const [profile, setProfile] = useState<RetentionProfile>(() =>
    retentionEngine.getProfile(userId)
  );
  const [mascotSettings, setMascotSettings] = useState(() =>
    companionEngine.getSettings(userId)
  );

  const [petMood, setPetMood] = useState<CompanionMood>('idle');
  const [speechBubble, setSpeechBubble] = useState<string>('');
  const [isPoking, setIsPoking] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [petName, setPetName] = useState(() => {
    return localStorage.getItem(`lifeos_pet_name_${userId}`) || 'Bé Đồng Hành';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(petName);

  // Sync profile & mascot
  useEffect(() => {
    setProfile(retentionEngine.getProfile(userId));
    setMascotSettings(companionEngine.getSettings(userId));
  }, [userId]);

  const currentMascotId = mascotSettings.mascotId || 'lumi';
  const mascotInfo = MASCOT_PROFILES[currentMascotId] || MASCOT_PROFILES.lumi;
  const currentStage = getEvolutionStage(profile.level);

  // Check Trifecta complete for today
  const todayStr = new Date().toISOString().split('T')[0];
  const isTrifectaClaimed = !!localStorage.getItem(`lifeos_trifecta_claimed_${todayStr}`);

  // Adaptive mood
  useEffect(() => {
    if (isTrifectaClaimed) {
      setPetMood('celebrate');
    } else if (profile.streak >= 3) {
      setPetMood('motivate');
    } else {
      setPetMood('idle');
    }
  }, [isTrifectaClaimed, profile.streak]);

  // Handle Poke interaction
  const handlePoke = () => {
    soundEngine.playPop();
    setIsPoking(true);
    triggerConfetti();

    const randomQuote = GENZ_PET_QUOTES[Math.floor(Math.random() * GENZ_PET_QUOTES.length)];
    setSpeechBubble(randomQuote);
    setPetMood('celebrate');

    setTimeout(() => {
      setIsPoking(false);
      setPetMood('idle');
    }, 4000);
  };

  // Switch Mascot
  const handleSelectMascot = (id: CompanionMascotId) => {
    soundEngine.playPop();
    companionEngine.saveSettings({ mascotId: id }, userId);
    setMascotSettings(companionEngine.getSettings(userId));
    setShowPicker(false);
    setSpeechBubble(`Chào bạn! Mình là ${MASCOT_PROFILES[id]?.name || id}, sẵn sàng đồng hành cùng bạn! ✨`);
    setTimeout(() => setSpeechBubble(''), 4500);
  };

  // Save Pet Nickname
  const handleSaveName = () => {
    const trimmed = tempName.trim() || 'Bé Đồng Hành';
    setPetName(trimmed);
    localStorage.setItem(`lifeos_pet_name_${userId}`, trimmed);
    setIsEditingName(false);
    soundEngine.playPop();
  };

  // Progress to next evolution
  const nextStageLevel = currentStage.stage < 4 
    ? (currentStage.stage === 1 ? 5 : currentStage.stage === 2 ? 10 : 20)
    : profile.level + 5;
  const prevStageLevel = currentStage.stage === 1 ? 1 : currentStage.stage === 2 ? 5 : 10;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((profile.level - prevStageLevel) / (nextStageLevel - prevStageLevel)) * 100))
  );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 text-white p-5 border border-slate-800 shadow-xl group">
      {/* Background ambient aura */}
      <div className={`absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-br ${currentStage.auraColor} rounded-full blur-3xl opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity`} />

      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Interactive Pet Character Area */}
        <div 
          onClick={handlePoke}
          title="Bấm vào để tương tác và nhận năng lượng tích cực!"
          className={`relative cursor-pointer transition-transform duration-300 select-none shrink-0 ${isPoking ? 'scale-110 rotate-3' : 'hover:scale-105 active:scale-95'}`}
        >
          {/* Stage Aura Ring */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center p-2 relative shadow-inner">
            <LiveMascotCharacter 
              mood={petMood} 
              mascotId={currentMascotId}
              size="normal"
            />

            {/* Stage Level Badge */}
            <span className="absolute -bottom-2 -left-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] uppercase shadow-md">
              LV.{profile.level}
            </span>

            {/* Poke Hint Button */}
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-md animate-pulse">
              ❤️
            </div>
          </div>
        </div>

        {/* Pet Info & Speech Balloon */}
        <div className="flex-1 min-w-0 text-center sm:text-left space-y-2 w-full">
          {/* Header row: Stage Badge & Settings button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r ${currentStage.auraColor} text-slate-950 shadow-xs`}>
                {currentStage.badge}
              </span>
              <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                {currentStage.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPicker(prev => !prev)}
              title="Đổi linh thú đồng hành"
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden md:inline">Đổi linh thú</span>
            </button>
          </div>

          {/* Pet Name with inline edit */}
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={18}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-white border border-emerald-500 text-xs font-bold focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="p-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-black text-white tracking-tight truncate flex items-center gap-1.5">
                  <span>{petName}</span>
                  <span className="text-xs text-emerald-400">({mascotInfo.name})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setTempName(petName);
                    setIsEditingName(true);
                  }}
                  title="Đổi biệt danh cho bé"
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>

          {/* Speech Dialogue Bubble */}
          <div className="relative p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200">
            <p className="italic font-medium leading-relaxed">
              "{speechBubble || mascotInfo.quote || currentStage.desc}"
            </p>
          </div>

          {/* Evolution Progression Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">
                Tiến hóa cấp tiếp theo: <span className="text-emerald-400">Lv.{nextStageLevel}</span>
              </span>
              <span className="text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full bg-gradient-to-r ${currentStage.auraColor} rounded-full transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mascot Switcher Modal / Popover */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowPicker(false)} />
          <div className="absolute left-4 right-4 top-14 bg-slate-900 border border-slate-700/90 rounded-2xl p-3 shadow-2xl z-40 space-y-2.5 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-[11px] font-black uppercase text-slate-400">Chọn Linh Thú Đồng Hành</span>
              <button 
                type="button" 
                onClick={() => setShowPicker(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(MASCOT_PROFILES) as CompanionMascotId[]).map((mId) => {
                const m = MASCOT_PROFILES[mId];
                const isSelected = currentMascotId === mId;
                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => handleSelectMascot(mId)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${isSelected ? 'bg-emerald-500/20 border-emerald-500 text-white font-black' : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <span className="text-2xl">{m.avatar}</span>
                    <span className="text-[11px] font-bold truncate w-full">{m.name}</span>
                    <span className="text-[9px] text-slate-400 truncate w-full">{m.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
