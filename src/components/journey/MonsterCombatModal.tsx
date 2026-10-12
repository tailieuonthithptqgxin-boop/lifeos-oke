import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Swords, Shield, Zap, Sparkles, Trophy, Skull, 
  RotateCcw, ArrowRight, Check, Flame, Award, Heart, 
  AlertCircle, ChevronRight, HelpCircle, Target, BookOpen, Clock
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { useAppStore } from '../../lib/store';

interface MonsterCombatModalProps {
  monster: any | null;
  isOpen: boolean;
  onClose: () => void;
  onBattleFinished: () => void;
  onGoToTrain: (module: 'tasks' | 'focus' | 'study' | 'habits' | 'finance') => void;
}

export function MonsterCombatModal({
  monster,
  isOpen,
  onClose,
  onBattleFinished,
  onGoToTrain
}: MonsterCombatModalProps) {
  const { currentUser } = useAppStore();

  const [stage, setStage] = useState<'PREVIEW' | 'BATTLING' | 'VICTORY' | 'DEFEAT'>('PREVIEW');
  const [battleResult, setBattleResult] = useState<any | null>(null);
  const [isCallingBattle, setIsCallingBattle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animation states during round playback
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [monsterHp, setMonsterHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [monsterMaxHp, setMonsterMaxHp] = useState(100);
  const [activeLogMessage, setActiveLogMessage] = useState<string>('');
  const [shakeActor, setShakeActor] = useState<'player' | 'monster' | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<{ actor: 'player' | 'monster'; text: string; isCrit: boolean } | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);

  const playbackTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && monster) {
      setStage('PREVIEW');
      setBattleResult(null);
      setErrorMessage(null);
      setCurrentRoundIdx(0);
      setMonsterMaxHp(monster.maxHp || 100);
      setMonsterHp(monster.maxHp || 100);
      setIsSkipping(false);
    }
    return () => {
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    };
  }, [isOpen, monster]);

  if (!isOpen || !monster) return null;

  // Handle Engage Battle (Calls Backend Source of Truth)
  const handleStartBattle = async () => {
    try {
      setIsCallingBattle(true);
      setErrorMessage(null);
      soundEngine.playPop();

      const res = await apiCall('/api/rpg/battle', 'POST', { monsterId: monster.id });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể bắt đầu trận chiến.');
      }

      const result = res.data;
      setBattleResult(result);
      setStage('BATTLING');
      setIsCallingBattle(false);

      // Initialize HP display
      const turns = result.turnsLog || [];
      const firstTurn = turns[0];
      const initialPlayerHp = firstTurn ? firstTurn.actorHpRemaining : 100;
      setPlayerMaxHp(initialPlayerHp);
      setPlayerHp(initialPlayerHp);
      setMonsterMaxHp(monster.maxHp);
      setMonsterHp(monster.maxHp);

      // Begin animated round-by-round playback
      playTurnByIndex(0, turns, result);
    } catch (err: any) {
      setIsCallingBattle(false);
      setErrorMessage(err.message || 'Lỗi khi khiêu chiến.');
    }
  };

  // Turn-by-turn combat animation player
  const playTurnByIndex = (idx: number, turns: any[], finalResult: any) => {
    if (idx >= turns.length) {
      // Battle animation finished -> transition to final result
      setTimeout(() => {
        if (finalResult.won) {
          soundEngine.playCelebration();
          triggerConfetti();
          setStage('VICTORY');
        } else {
          soundEngine.playPop();
          setStage('DEFEAT');
        }
        onBattleFinished();
      }, 700);
      return;
    }

    const turn = turns[idx];
    setCurrentRoundIdx(turn.round);
    setActiveLogMessage(turn.message);

    // Apply actor hit animation
    if (turn.actor === 'PLAYER') {
      setShakeActor('monster');
      setMonsterHp(turn.targetHpRemaining);
      setFloatingDamage({
        actor: 'monster',
        text: `-${turn.damage}`,
        isCrit: turn.action === 'CRIT'
      });
      soundEngine.playPop();
    } else {
      setShakeActor('player');
      setPlayerHp(turn.targetHpRemaining);
      setFloatingDamage({
        actor: 'player',
        text: `-${turn.damage}`,
        isCrit: false
      });
      soundEngine.playPop();
    }

    // Reset damage popup
    setTimeout(() => {
      setShakeActor(null);
      setFloatingDamage(null);
    }, 450);

    // Schedule next round
    playbackTimerRef.current = setTimeout(() => {
      playTurnByIndex(idx + 1, turns, finalResult);
    }, 850);
  };

  // Instant Skip Animation
  const handleSkipAnimation = () => {
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    setIsSkipping(true);
    if (!battleResult) return;

    setPlayerHp(battleResult.playerHpRemaining);
    setMonsterHp(battleResult.monsterHpRemaining);

    if (battleResult.won) {
      soundEngine.playCelebration();
      triggerConfetti();
      setStage('VICTORY');
    } else {
      setStage('DEFEAT');
    }
    onBattleFinished();
  };

  const playerHpPercent = Math.max(0, Math.min(100, Math.round((playerHp / (playerMaxHp || 1)) * 100)));
  const monsterHpPercent = Math.max(0, Math.min(100, Math.round((monsterHp / (monsterMaxHp || 1)) * 100)));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Ambient Glow */}
        <div className={`absolute -top-32 -right-32 w-80 h-80 ${
          monster.isBoss ? 'bg-rose-500/15' : 'bg-emerald-500/15'
        } rounded-full blur-3xl pointer-events-none`} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
              monster.isBoss 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {monster.isBoss ? '🔥 BOSS BATTLE' : `CHƯƠNG ${monster.chapter} · ẢI CHIẾN`}
            </span>
            <span className="text-xs font-bold text-slate-400">
              {monster.title}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 1: PRE-BATTLE PREVIEW & REAL REQUISITE AUDIT            */}
        {/* ============================================================== */}
        {stage === 'PREVIEW' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Monster Banner */}
            <div className={`p-6 rounded-3xl bg-gradient-to-br ${monster.bgTheme} border border-slate-700/80 shadow-xl flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left`}>
              <div className="w-24 h-24 rounded-3xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-5xl shadow-2xl shrink-0 relative group">
                <span className="group-hover:scale-125 transition-transform duration-300">{monster.avatar}</span>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] uppercase shadow-md">
                  LV.{monster.level}
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white">{monster.name}</h3>
                  <span className="text-xs font-bold text-amber-400">({monster.title})</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {monster.description}
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-rose-300 font-medium">
                  <Skull className="w-3.5 h-3.5" />
                  <span>Kẻ thù ngoài đời: <strong>{monster.realLifeNemesis}</strong></span>
                </div>
              </div>
            </div>

            {/* Monster Attributes Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block">MÁU (MAX HP)</span>
                <span className="text-lg font-black text-rose-400 block mt-0.5">{monster.maxHp} HP</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block">SỨC MẠNH (POWER)</span>
                <span className="text-lg font-black text-amber-400 block mt-0.5">{monster.power} POW</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block">GIÁP TRỤ (DEFENSE)</span>
                <span className="text-lg font-black text-emerald-400 block mt-0.5">{monster.defense} DEF</span>
              </div>
            </div>

            {/* Real-Life Requirement Box (Action = Power) */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Điều kiện rèn luyện ngoài đời thật:
                </span>
                <span className={`font-black text-[11px] ${
                  monster.meetsRealPrerequisite ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {monster.meetsRealPrerequisite ? '✓ ĐÃ ĐẠT ĐIỀU KIỆN' : 'CHƯA ĐỦ ĐIỀU KIỆN'}
                </span>
              </div>

              <p className="text-xs text-slate-300">
                {monster.requiredRealAction.description}
              </p>

              {monster.realRequirementProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Tiến độ hành động thật</span>
                    <span className="font-mono">{monster.realRequirementProgress.current} / {monster.realRequirementProgress.target}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${monster.realRequirementProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Loot & Rewards Preview */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                CHIẾN LỢI PHẨM KHI HẠ GỤC (REWARDS & LOOT)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  <span>+{monster.rewardXp} XP</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <span>+{monster.rewardCoins} 🪙 Coins</span>
                </div>
                {monster.dropEquipmentKey && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cơ hội rớt Trang Bị Cực Phẩm ({monster.dropRatePercent}%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {monster.canChallenge ? (
                <button
                  onClick={handleStartBattle}
                  disabled={isCallingBattle}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Swords className="w-5 h-5 stroke-[2.5]" />
                  <span>{isCallingBattle ? 'Đang chuẩn bị đấu trường...' : 'TIẾN VÀO CHIẾN ĐẤU (ENGAGE)'}</span>
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center font-bold">
                    ⚠️ Bạn chưa đủ điều kiện hành động thật ngoài đời để khiêu chiến quái vật này!
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onGoToTrain('focus');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-4 h-4 text-teal-400" />
                      <span>Tập Trung Focus</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onGoToTrain('tasks');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Target className="w-4 h-4 text-emerald-400" />
                      <span>Làm Nhiệm Vụ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 2: REAL-TIME ROUND-BY-ROUND COMBAT ARENA                */}
        {/* ============================================================== */}
        {stage === 'BATTLING' && (
          <div className="p-6 space-y-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Arena Header: Round Indicator & Skip button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                HIỆP ĐẤU: VÒNG {currentRoundIdx || 1}
              </span>
              <button
                onClick={handleSkipAnimation}
                className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Bỏ qua hoạt ảnh ⏩
              </button>
            </div>

            {/* Combat Arena Canvas: Player vs Monster */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 items-center py-4 relative">
              
              {/* Left: Player Side */}
              <div className={`p-5 rounded-3xl bg-slate-950/80 border border-slate-800 text-center space-y-3 relative transition-transform ${
                shakeActor === 'player' ? 'animate-bounce ring-2 ring-rose-500' : ''
              }`}>
                {floatingDamage && floatingDamage.actor === 'player' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-black text-sm animate-ping">
                    {floatingDamage.text}
                  </div>
                )}

                <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-800 to-slate-700 border-2 border-emerald-500/50 flex items-center justify-center text-3xl font-black text-emerald-400 shadow-xl">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>⚡</span>
                  )}
                </div>

                <div>
                  <span className="text-xs font-black text-white block truncate">{currentUser?.name || 'Anh Hùng'}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Người Chinh Phục</span>
                </div>

                {/* Player HP Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">HP</span>
                    <span className="text-emerald-400">{playerHp} / {playerMaxHp}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        playerHpPercent > 50 ? 'bg-emerald-500' : playerHpPercent > 25 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${playerHpPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* VS Divider Badge */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-900 border-2 border-amber-400 text-amber-400 font-black text-xs flex items-center justify-center shadow-xl">
                VS
              </div>

              {/* Right: Monster Side */}
              <div className={`p-5 rounded-3xl bg-slate-950/80 border border-slate-800 text-center space-y-3 relative transition-transform ${
                shakeActor === 'monster' ? 'animate-bounce ring-2 ring-emerald-500' : ''
              }`}>
                {floatingDamage && floatingDamage.actor === 'monster' && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md font-black text-sm animate-ping ${
                    floatingDamage.isCrit ? 'bg-amber-400 text-slate-950 text-base scale-110' : 'bg-rose-600 text-white'
                  }`}>
                    {floatingDamage.text} {floatingDamage.isCrit ? '💥 CRIT!' : ''}
                  </div>
                )}

                <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border-2 border-rose-500/50 flex items-center justify-center text-4xl shadow-xl">
                  <span>{monster.avatar}</span>
                </div>

                <div>
                  <span className="text-xs font-black text-white block truncate">{monster.name}</span>
                  <span className="text-[10px] text-rose-400 font-bold">LV.{monster.level} · {monster.title}</span>
                </div>

                {/* Monster HP Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">HP</span>
                    <span className="text-rose-400">{monsterHp} / {monsterMaxHp}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        monsterHpPercent > 50 ? 'bg-rose-500' : monsterHpPercent > 25 ? 'bg-amber-400' : 'bg-rose-700'
                      }`}
                      style={{ width: `${monsterHpPercent}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Combat Live Log Feed */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center min-h-[56px] flex items-center justify-center">
              <span className="text-xs font-bold text-amber-300 animate-pulse">
                {activeLogMessage || 'Đang trao đổi chiêu thức kịch tính...'}
              </span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 3: VICTORY SCREEN                                       */}
        {/* ============================================================== */}
        {stage === 'VICTORY' && (
          <div className="p-6 space-y-6 text-center overflow-y-auto">
            <div className="space-y-2 pt-2">
              <span className="text-5xl animate-bounce block">🏆</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                CHIẾN THẮNG HUY HOÀNG!
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Bạn đã đánh bại <strong className="text-amber-400">{monster.name}</strong> bằng chính nội lực tích lũy từ những thói quen và công việc hoàn thành ngoài đời thực!
              </p>
            </div>

            {/* Loot & Rewards Won Card */}
            <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 max-w-md mx-auto space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                PHẦN THƯỞNG CHIẾN THẮNG ĐÃ LƯU VÀO TÀI KHOẢN
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                  <span className="text-lg font-black text-indigo-400 block">+{battleResult?.rewardXp || monster.rewardXp} XP</span>
                  <span className="text-[10px] text-slate-400">Kinh nghiệm nhân vật</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-lg font-black text-amber-400 block">+{battleResult?.rewardCoins || monster.rewardCoins} 🪙</span>
                  <span className="text-[10px] text-slate-400">Coins mua trang bị</span>
                </div>
              </div>

              {/* Equipment Dropped */}
              {battleResult?.droppedEquipment && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/30 text-left flex items-center gap-3">
                  <span className="text-3xl shrink-0">{battleResult.droppedEquipment.icon || '🗡️'}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase block">RỚT TRANG BỊ MỚI!</span>
                    <span className="text-xs font-black text-white truncate block">{battleResult.droppedEquipment.name}</span>
                    <span className="text-[10px] text-slate-300 block">{battleResult.droppedEquipment.specialEffectDescription || battleResult.droppedEquipment.lore}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full max-w-md mx-auto py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Tiếp Tục Hành Trình
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 4: DEFEAT SCREEN & SMART REAL TRAINING HINTS            */}
        {/* ============================================================== */}
        {stage === 'DEFEAT' && (
          <div className="p-6 space-y-6 text-center overflow-y-auto">
            <div className="space-y-2 pt-2">
              <span className="text-5xl block">⚔️</span>
              <h2 className="text-2xl font-black text-rose-400 tracking-tight">
                THẤT BẠI TẠM THỜI
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                <strong className="text-white">{monster.name}</strong> còn quá mạnh ở thời điểm hiện tại. Nhưng thất bại trong RPG này chỉ có nghĩa là bạn cần rèn luyện thêm ngoài đời thực!
              </p>
            </div>

            {/* Smart Real-Life Training Advice Box */}
            <div className="p-5 rounded-3xl bg-slate-950/90 border border-amber-500/30 max-w-md mx-auto space-y-3 text-left">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>KẾ HOẠCH TẬP LUYỆN ĐỂ BỨT PHÁ:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {battleResult?.trainingHint || 'Hãy hoàn thành thêm các nhiệm vụ công việc, tăng thời gian tập trung Focus sâu và giữ vững thói quen kỷ luật để gia tăng Power và Giáp trụ.'}
              </p>
            </div>

            {/* Action Buttons to go train */}
            <div className="w-full max-w-md mx-auto space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onGoToTrain('focus');
                  }}
                  className="py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Đi Tập Trung Focus</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onGoToTrain('tasks');
                  }}
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Target className="w-4 h-4" />
                  <span>Đi Làm Nhiệm Vụ</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
