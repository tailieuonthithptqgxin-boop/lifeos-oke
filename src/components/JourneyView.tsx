import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, Trophy, Calendar, Sparkles, Plus, Trash2, Share2, 
  Flame, Target, DollarSign, Clock, BookOpen, Briefcase, Heart, 
  Award, CheckCircle2, ChevronRight, Filter, ArrowUpRight, Shield, 
  Zap, BarChart3, RefreshCw, X, AlertCircle, Lock, Unlock,
  Coins, Check, Star, Crown, Palette, Layers, ChevronDown, 
  ArrowRight, Play, Eye, EyeOff, Sparkle, UserCheck, Gift, Skull, Sword, Package,
  Camera, Upload
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { formatCurrency, formatDate } from '../lib/utils';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { 
  DailyQuestItem, 
  WeeklyChallengeItem, 
  JourneyChapterItem, 
  CosmeticItem,
  ChapterNodeItem,
  AchievementItem
} from '../backend/services/progression.service';
import { MilestoneItem } from '../backend/services/journey.service';
import { AchievementShareModal } from './journey/AchievementShareModal';
import { DailyMysteryChestModal } from './journey/DailyMysteryChestModal';
import { StageBattleModal } from './journey/StageBattleModal';
import { LifeBattlePassTrack } from './journey/LifeBattlePassTrack';
import { HeroAvatarModal } from './journey/HeroAvatarModal';
import { MonsterCombatModal } from './journey/MonsterCombatModal';
import { RPGCharacterHub } from './journey/RPGCharacterHub';
import { RPGWorldMapView } from './journey/RPGWorldMapView';
import { RPGSkillTreeModal } from './journey/RPGSkillTreeModal';

export function JourneyView() {
  const { currentUser, setCurrentView, addTask, updateProfile } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Progression State from Backend
  const [progState, setProgState] = useState<{
    level: number;
    levelTitle: string;
    totalXp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    xpNeededForNextLevel: number;
    levelProgressPercent: number;
    coins: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    equipped: { title: string; frame: string; badge: string; accent: string };
    categories: {
      learning: { xp: number; level: number; title: string; percent: number };
      habit: { xp: number; level: number; title: string; percent: number };
      focus: { xp: number; level: number; title: string; percent: number };
      finance: { xp: number; level: number; title: string; percent: number };
    };
    dailyQuests: DailyQuestItem[];
    weeklyChallenges: WeeklyChallengeItem[];
    journeyChapters: JourneyChapterItem[];
    achievements: AchievementItem[];
    weeklyStats: {
      tasksCompleted: number;
      focusMinutes: number;
      learningMinutes: number;
      habitsCompleted: number;
      savingsAmount: number;
      streakDays: number;
    };
    allTimeStats: {
      totalTasksCompleted: number;
      totalFocusMinutes: number;
      totalLearningCount: number;
      totalHabitsStreak: number;
      totalSavingsAmount: number;
    };
    recentXpLedger: any[];
    recentCoinLedger: any[];
    cosmeticsCatalog: CosmeticItem[];
  } | null>(null);

  // Milestones Timeline State
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);

  // Navigation tab in Progression Hub (Hero Profile & RPG World Map at the top)
  const [activeTab, setActiveTab] = useState<'profile' | 'map' | 'skills' | 'milestones' | 'quests' | 'battlepass' | 'achievements' | 'armory'>('profile');

  // RPG Real Character Stats & Monster Battle State
  const [charStats, setCharStats] = useState<any | null>(null);
  const [selectedMonsterForCombat, setSelectedMonsterForCombat] = useState<any | null>(null);
  const [combatModalOpen, setCombatModalOpen] = useState(false);
  const [skillTreeModalOpen, setSkillTreeModalOpen] = useState(false);

  // Hero Avatar Modal & Direct Upload State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isUploadingHeroAvatar, setIsUploadingHeroAvatar] = useState(false);
  const heroAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleDirectHeroAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh đại diện không được vượt quá 5MB');
      return;
    }

    try {
      setIsUploadingHeroAvatar(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            folder: 'avatars'
          });
          const newAvatarUrl = res.file?.url || base64Data;
          await updateProfile({ avatar: newAvatarUrl });
          soundEngine.playSuccess();
          triggerConfetti();
        } catch (uploadErr) {
          await updateProfile({ avatar: base64Data });
          soundEngine.playSuccess();
          triggerConfetti();
        } finally {
          setIsUploadingHeroAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingHeroAvatar(false);
      alert(err.message || 'Lỗi khi đọc file ảnh');
    }
  };

  // Armory filter tab: ALL, UNLOCKED, LOCKED
  const [armoryFilter, setArmoryFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  // Selected Node in Journey Map for Stage Battle Modal
  const [stageBattleNode, setStageBattleNode] = useState<ChapterNodeItem | null>(null);

  // Daily Mystery Chest State
  const [chestModalOpen, setChestModalOpen] = useState(false);
  const [openingChest, setOpeningChest] = useState(false);
  const [chestReward, setChestReward] = useState<{
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    xp: number;
    coins: number;
    title: string;
  } | null>(null);

  // Floating XP Gain Feedback animation
  const [floatingXp, setFloatingXp] = useState<{ amount: number; text: string } | null>(null);

  // Level Up Celebration Modal
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ fromLevel: number; toLevel: number; title: string } | null>(null);

  // Share card modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedMilestoneForShare, setSelectedMilestoneForShare] = useState<MilestoneItem | null>(null);

  // Manual milestone modal
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualCategory, setManualCategory] = useState('personal');
  const [manualMetric, setManualMetric] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [manualIcon, setManualIcon] = useState('🏆');

  // Quick Task for First Quest
  const [firstTaskTitle, setFirstTaskTitle] = useState('');
  const [creatingFirstTask, setCreatingFirstTask] = useState(false);

  // Action loading states
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);

  // Selected Chapter for inspecting nodes
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(1);

  // Fetch full progression data
  const fetchAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [progRes, journeyRes, charRes] = await Promise.all([
        apiCall('/api/progression'),
        apiCall('/api/journey'),
        apiCall('/api/rpg/character')
      ]);

      if (progRes && progRes.data) {
        setProgState(progRes.data);
      }
      if (journeyRes && journeyRes.milestones) {
        setMilestones(journeyRes.milestones);
      }
      if (charRes && charRes.data) {
        setCharStats(charRes.data);
      }
    } catch (err) {
      console.error('Failed to load progression hub data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Show floating XP animation
  const triggerXpGainAnimation = (amount: number, text: string) => {
    setFloatingXp({ amount, text });
    setTimeout(() => {
      setFloatingXp(null);
    }, 2500);
  };

  // Open Daily Mystery Chest
  const handleOpenDailyChest = async () => {
    if (openingChest) return;
    setOpeningChest(true);
    try {
      const res = await apiCall('/api/progression/chest/open', 'POST');
      if (res && res.success) {
        if (res.data?.alreadyClaimed) {
          alert(res.data.message || 'Bạn đã mở rương kho báu hôm nay rồi!');
        } else {
          setChestReward(res.data);
          setChestModalOpen(true);
          await fetchAllData(true);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Không thể mở rương kho báu');
    } finally {
      setOpeningChest(false);
    }
  };

  // Claim a daily quest
  const handleClaimQuest = async (questKey: string, quest: DailyQuestItem) => {
    setClaimingKey(questKey);
    try {
      const res = await apiCall('/api/progression/quest/claim', 'POST', { questKey });
      if (res && res.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        triggerXpGainAnimation(quest.rewardXp, quest.title);

        if (res.data?.leveledUp) {
          setLevelUpData({
            fromLevel: res.data.oldLevel,
            toLevel: res.data.newLevel,
            title: res.data.newTitle || 'Cấp Độ Mới'
          });
          setLevelUpModalOpen(true);
        }

        await fetchAllData(true);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể nhận thưởng');
    } finally {
      setClaimingKey(null);
    }
  };

  // Claim a weekly challenge
  const handleClaimChallenge = async (challengeKey: string, challenge: WeeklyChallengeItem) => {
    setClaimingKey(challengeKey);
    try {
      const res = await apiCall('/api/progression/challenge/claim', 'POST', { challengeKey });
      if (res && res.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        triggerXpGainAnimation(challenge.rewardXp, challenge.title);

        if (res.data?.leveledUp) {
          setLevelUpData({
            fromLevel: res.data.oldLevel,
            toLevel: res.data.newLevel,
            title: res.data.newTitle || 'Cấp Độ Mới'
          });
          setLevelUpModalOpen(true);
        }

        await fetchAllData(true);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể nhận thưởng');
    } finally {
      setClaimingKey(null);
    }
  };

  // Unlock cosmetic with coins
  const handleUnlockCosmetic = async (cosmeticKey: string) => {
    setPurchasingKey(cosmeticKey);
    try {
      const res = await apiCall('/api/progression/reward/unlock', 'POST', { cosmeticKey });
      if (res && res.success) {
        soundEngine.playPop();
        await fetchAllData(true);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể mở khóa ngoại trang');
    } finally {
      setPurchasingKey(null);
    }
  };

  // Equip cosmetic
  const handleEquipCosmetic = async (rewardType: 'title' | 'frame' | 'badge' | 'accent', rewardKey: string) => {
    try {
      const res = await apiCall('/api/progression/reward/equip', 'POST', { rewardType, rewardKey });
      if (res && res.success) {
        soundEngine.playPop();
        await fetchAllData(true);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể trang bị ngoại trang');
    }
  };

  // Quick Task create for first quest
  const handleCreateFirstTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstTaskTitle.trim()) return;
    setCreatingFirstTask(true);
    try {
      await addTask({
        title: firstTaskTitle.trim(),
        priority: 'Cao',
        status: 'Chưa làm',
        dueDate: new Date().toISOString().split('T')[0]
      });
      setFirstTaskTitle('');
      soundEngine.playPop();
      await fetchAllData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingFirstTask(false);
    }
  };

  // Create manual milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    try {
      await apiCall('/api/journey/milestone', 'POST', {
        title: manualTitle.trim(),
        description: manualDesc.trim(),
        category: manualCategory,
        date: new Date().toISOString().split('T')[0],
        icon: manualIcon,
        metricValue: manualMetric.trim(),
        metricLabel: manualLabel.trim(),
        isHighlighted: true
      });
      setAddMilestoneOpen(false);
      setManualTitle('');
      setManualDesc('');
      setManualMetric('');
      setManualLabel('');
      await fetchAllData(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Share Player Card
  const handleSharePlayerCard = () => {
    if (!progState) return;
    const playerMilestone: MilestoneItem = {
      id: 'player-profile-card',
      userId: currentUser?.id || '',
      title: `Life Level ${progState.level} · ${progState.levelTitle}`,
      description: `Đang kiên trì xây dựng phiên bản tốt hơn mỗi ngày trên LifeOS. Chuỗi kỷ luật ${progState.currentStreak} ngày liên tục!`,
      category: 'personal',
      date: new Date().toISOString().split('T')[0],
      icon: '⚡',
      metricValue: `${progState.totalXp} XP · ${progState.coins} Coins`,
      metricLabel: 'TỔNG TIẾN ĐỘ CUỘC ĐỜI',
      isHighlighted: true,
      isManual: false,
      createdAt: new Date().toISOString()
    };
    setSelectedMilestoneForShare(playerMilestone);
    setShareModalOpen(true);
  };

  if (loading || !progState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-8 text-slate-500">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Đang khởi động Game-Like Life Progression Hub...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Đang đối chiếu dữ liệu thực tế từ Task, Habit, Focus và Học tập.
        </p>
      </div>
    );
  }

  // Check if brand new user (Empty state condition)
  const isBrandNewUser = progState.totalXp === 0 && (progState.allTimeStats.totalTasksCompleted === 0);

  // Frame styling mapping
  const frameClass = 
    progState.equipped.frame === 'frame_emerald_neon' ? 'ring-3 ring-emerald-500 shadow-lg shadow-emerald-500/30' :
    progState.equipped.frame === 'frame_cyber_cyan' ? 'ring-3 ring-cyan-400 shadow-lg shadow-cyan-400/30' :
    progState.equipped.frame === 'frame_obsidian_gold' ? 'ring-3 ring-amber-400 shadow-lg shadow-amber-400/30' :
    progState.equipped.frame === 'frame_amethyst_aura' ? 'ring-3 ring-purple-500 shadow-lg shadow-purple-500/30' :
    'ring-2 ring-slate-700';

  // Today completion percentage calculation
  const todayTotalQuests = progState.dailyQuests.length;
  const todayCompletedQuests = progState.dailyQuests.filter(q => q.isCompleted).length;
  const todayPercent = todayTotalQuests > 0 ? Math.round((todayCompletedQuests / todayTotalQuests) * 100) : 0;

  // Focus time formatted
  const focusTotalMinutes = progState.allTimeStats.totalFocusMinutes || 0;
  const focusH = Math.floor(focusTotalMinutes / 60);
  const focusM = focusTotalMinutes % 60;

  // Learning time formatted
  const learningMinutes = (progState.weeklyStats.learningMinutes || 0);
  const learningH = Math.floor(learningMinutes / 60);
  const learningM = learningMinutes % 60;

  const selectedChapter = progState.journeyChapters.find(c => c.index === selectedChapterIndex) || progState.journeyChapters[0];

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 relative animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-x-hidden">
      
      {/* Floating XP Gain Animation Toast */}
      {floatingXp && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>+{floatingXp.amount} XP ✨ XP EARNED</span>
          <span className="text-xs font-semibold opacity-80">({floatingXp.text})</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. HERO SECTION: MY JOURNEY (SPEC MATCH EXACT)                */}
      {/* ============================================================== */}
      {isBrandNewUser ? (
        // EMPTY STATE FOR NEW USERS
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-emerald-500/30 p-6 sm:p-8 text-white shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span>🌱 LEVEL 1 · INITIATOR</span>
            </div>
            <span className="text-xs font-bold text-slate-400">0 / 100 XP</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Hành Trình Của Bạn Bắt Đầu Tại Đây 🌱
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Chào mừng bạn đến với LifeOS. Mỗi công việc hoàn thành, mỗi phút tập trung hay thói quen duy trì sẽ mở khóa phiên bản tốt hơn của chính bạn.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 max-w-xl">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider block">
              FIRST QUEST · NHIỆM VỤ ĐẦU TIÊN
            </span>
            <p className="text-xs text-slate-300">
              Tạo nhiệm vụ công việc đầu tiên để nhận ngay <strong className="text-emerald-400">+20 XP & +4 Coins</strong> khởi đầu hành trình!
            </p>
            <form onSubmit={handleCreateFirstTask} className="flex gap-2">
              <input
                type="text"
                required
                value={firstTaskTitle}
                onChange={(e) => setFirstTaskTitle(e.target.value)}
                placeholder="VD: Đọc 10 trang sách, Viết kế hoạch ngày..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={creatingFirstTask}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition shrink-0 cursor-pointer"
              >
                {creatingFirstTask ? 'Đang tạo...' : '+ Tạo Task Đầu Tiên'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // ACTIVE PROGRESSION HERO SECTION (EXACT BOX FORMAT)
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-white">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left: Level, Title & XP Progress */}
            <div className="space-y-3 flex-1 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  LEVEL {progState.level}
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wider flex items-center gap-1">
                  <span>⚡</span>
                  <span>{((progState.totalXp * 2) + (progState.currentStreak * 100) + (progState.allTimeStats.totalTasksCompleted * 20) + (progState.allTimeStats.totalFocusMinutes * 5)).toLocaleString()} CP</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Hành Trình Của Tôi · Your Journey</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {progState.levelTitle}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Mỗi ngày kỷ luật mở khóa một phiên bản xuất sắc hơn của chính bạn.
                </p>
              </div>

              {/* Box XP Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 font-mono tracking-tight">
                    {progState.totalXp} / {progState.xpForNextLevel} XP
                  </span>
                  <span className="text-emerald-400 font-bold">
                    +{progState.xpNeededForNextLevel} XP to Level {progState.level + 1}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-800 p-0.5 border border-slate-700/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-700 shadow-sm"
                    style={{ width: `${Math.max(4, progState.levelProgressPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
              {/* Daily Mystery Chest Button */}
              <button
                onClick={handleOpenDailyChest}
                disabled={openingChest}
                className="relative group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs shadow-lg shadow-amber-500/10 hover:border-amber-400 active:scale-95 transition cursor-pointer"
              >
                <span className="text-lg group-hover:scale-125 transition-transform duration-300">🎁</span>
                <div className="text-left">
                  <span className="block text-[9px] uppercase tracking-wider text-amber-400/80">DAILY LOOT</span>
                  <span className="block font-black text-amber-200">MỞ RƯƠNG MAY MẮN</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-1" />
              </button>

              <button
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Làm mới tiến độ"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setLevelUpData({
                    fromLevel: progState.level,
                    toLevel: progState.level + 1,
                    title: progState.levelTitle
                  });
                  setLevelUpModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                <Sparkle className="w-3.5 h-3.5" />
                <span>Xem Thưởng Level</span>
              </button>

              <button
                onClick={handleSharePlayerCard}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Khoe Thành Tựu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL PROGRESSION STATS STRIP (MATCH SPEC EXACTLY) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {/* COMBAT POWER */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900 border border-amber-500/30 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">COMBAT POWER (CP)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {((progState.totalXp * 2) + (progState.currentStreak * 100) + (progState.allTimeStats.totalTasksCompleted * 20) + (progState.allTimeStats.totalFocusMinutes * 5)).toLocaleString()}
            </span>
            <span className="text-sm font-bold text-amber-300">CP</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Lực chiến cuộc đời ⚡</span>
        </div>

        {/* CURRENT STREAK */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CURRENT STREAK</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-500">{progState.currentStreak} DAYS</span>
            <span className="text-lg">🔥</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Kỷ lục: {progState.longestStreak} ngày</span>
        </div>

        {/* COINS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">COINS</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-500">{progState.coins.toLocaleString()}</span>
            <span className="text-lg">🪙</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Dùng mở khóa ngoại trang</span>
        </div>

        {/* TODAY */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TODAY</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{todayPercent}%</span>
            <span className="text-xs font-bold text-slate-400">COMPLETE</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">{todayCompletedQuests}/{todayTotalQuests} nhiệm vụ</span>
        </div>

        {/* FOCUS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">FOCUS</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400">
              {focusH}h {focusM}m
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Tổng làm việc sâu thực tế</span>
        </div>

        {/* LEARNING */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">LEARNING</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {progState.allTimeStats.totalLearningCount} từ
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">{learningH}h ôn tập</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. NAVIGATION BAR (JOURNEY TABS - HERO PROFILE & MILESTONES 1ST) */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Hồ Sơ Anh Hùng & Trang Bị</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'map'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Bản Đồ Quái Vật & Trùm (RPG World)</span>
        </button>

        <button
          onClick={() => setSkillTreeModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Cây Kỹ Năng {charStats?.availableSkillPoints > 0 ? `(${charStats.availableSkillPoints}⭐)` : ''}</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'milestones'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bia Khắc Cột Mốc ({milestones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'quests'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Bảng Săn Thưởng (Bounty Quests)</span>
          {progState.dailyQuests.some(q => q.isCompleted && !q.isClaimed) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('battlepass')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'battlepass'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Life Pass (Battle Pass)</span>
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'achievements'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Đền Thờ Thành Tựu</span>
        </button>

        <button
          onClick={() => setActiveTab('armory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'armory'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Kho Ngoại Trang (Armory)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: VISUAL JOURNEY MAP & 5 CHAPTERS SYSTEM                  */}
      {/* ============================================================== */}
      {/* TAB 1: RPG WORLD MAP & MONSTER BATTLE ARENA                    */}
      {/* ============================================================== */}
      {activeTab === 'map' && (
        <RPGWorldMapView
          onSelectMonster={(monster) => {
            setSelectedMonsterForCombat(monster);
            setCombatModalOpen(true);
          }}
          onGoToTrain={(module) => setCurrentView(module)}
        />
      )}
      {false && (
        <div className="space-y-8">
          
          {/* Chapter Selector Cards (01 START, 02 BUILD, 03 FOCUS, 04 GROW, 05 MASTER) */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {progState.journeyChapters.map((ch) => {
              const isSelected = ch.index === selectedChapterIndex;
              const completedNodesCount = ch.nodes.filter(n => n.status === 'COMPLETED' || n.status === 'MASTERED').length;

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChapterIndex(ch.index)}
                  className={`p-4 rounded-3xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-md'
                      : ch.isCompleted
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                      : 'border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                        {String(ch.index).padStart(2, '0')} {ch.title.split(': ')[1]?.split(' ')[0] || ''}
                      </span>
                      {ch.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : ch.isUnlocked ? (
                        <span className="text-[10px] font-bold text-amber-500">{ch.progressPercent}%</span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {ch.title.split(': ')[1] || ch.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {ch.tagline}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>{completedNodesCount}/{ch.nodes.length} mốc</span>
                    <span className="text-emerald-600 dark:text-emerald-400">[ XEM ]</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISUAL JOURNEY MAP (3D STAGE ORBS + SERPENTINE NEON TRAIL) */}
          <div className="relative p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-white">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
                  <span>REALM {selectedChapter.index} · THẾ GIỚI PHIÊU LƯU</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {selectedChapter.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedChapter.tagline}
                </p>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>Thưởng Vượt Chương: <strong className="text-white font-black">+{selectedChapter.chapterReward.coins} 🪙</strong> · {selectedChapter.chapterReward.title}</span>
              </div>
            </div>

            {/* Visual Serpentine Adventure Stage Roadmap */}
            <div className="relative max-w-4xl mx-auto py-8">
              
              {/* Vertical Glowing Energy Rail */}
              <div className="absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-1.5 bg-gradient-to-b from-emerald-500 via-teal-400 to-amber-500 rounded-full shadow-lg shadow-emerald-500/30 hidden md:block" />
              <div className="absolute left-8 top-4 bottom-4 w-1.5 bg-gradient-to-b from-emerald-500 via-teal-400 to-amber-500 rounded-full shadow-lg shadow-emerald-500/30 md:hidden" />

              <div className="space-y-12 relative z-10">
                {selectedChapter.nodes.map((node: ChapterNodeItem, idx: number) => {
                  const isMastered = node.status === 'MASTERED';
                  const isDone = node.status === 'COMPLETED' || isMastered;
                  const isLocked = node.status === 'LOCKED';
                  const percent = Math.min(100, Math.round((node.current / node.target) * 100));
                  const isEven = idx % 2 === 0;
                  const isBoss = idx === selectedChapter.nodes.length - 1;
                  const starsEarned = isMastered ? 3 : isDone ? 2 : percent > 0 ? 1 : 0;

                  return (
                    <div
                      key={node.id}
                      className={`flex items-center gap-6 ${
                        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                      } flex-row`}
                    >
                      {/* Node Card / Briefing */}
                      <div 
                        onClick={() => {
                          setStageBattleNode(node);
                          soundEngine.playPop();
                        }}
                        className={`flex-1 p-5 rounded-3xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.99] ${
                          isBoss
                            ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/60 shadow-xl shadow-rose-500/10'
                            : isDone 
                            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                            : isLocked 
                            ? 'bg-slate-800/40 border-slate-800 opacity-60'
                            : 'bg-slate-800/90 border-slate-700 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                            isBoss ? 'bg-rose-500 text-white animate-pulse' :
                            isMastered ? 'bg-amber-400 text-slate-950' :
                            isDone ? 'bg-emerald-500 text-slate-950' :
                            isLocked ? 'bg-slate-700 text-slate-300' : 'bg-teal-500/20 text-teal-300'
                          }`}>
                            {isBoss ? '🔥 BOSS STAGE' : isMastered ? '👑 ẢI TINH HOA' : isDone ? '✓ ĐÃ VƯỢT ẢI' : isLocked ? '🔒 KHÓA' : '⚡ ĐANG THỬ THÁCH'}
                          </span>

                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map((starIdx) => (
                              <Star
                                key={starIdx}
                                className={`w-3.5 h-3.5 ${
                                  starIdx <= starsEarned
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          <span>{node.title}</span>
                          {node.rewardTitle && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 font-bold">
                              {node.rewardTitle}
                            </span>
                          )}
                        </h4>

                        <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {node.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                            <span>Mục tiêu: {node.requirementText}</span>
                            <span className="font-bold text-white font-mono">{node.current} / {node.target} {node.unit} ({percent}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isBoss ? 'bg-rose-500' : isDone ? 'bg-emerald-400' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3D Circular Stage Orb */}
                      <div 
                        onClick={() => {
                          setStageBattleNode(node);
                          soundEngine.playPop();
                        }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
                          isBoss
                            ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white ring-4 ring-rose-500/40 shadow-2xl shadow-rose-500/30'
                            : isDone 
                            ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-4 ring-emerald-500/30 shadow-xl shadow-emerald-500/20'
                            : isLocked
                            ? 'bg-slate-800 text-slate-600 ring-2 ring-slate-700'
                            : 'bg-slate-800 text-emerald-400 ring-4 ring-emerald-500/40 shadow-lg shadow-emerald-500/20 animate-pulse'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl select-none">
                          {isBoss ? '💀' : isMastered ? '🏆' : isDone ? '✓' : isLocked ? '🔒' : '⚔️'}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">
                          {isBoss ? 'BOSS' : `ẢI ${idx + 1}`}
                        </span>
                      </div>

                      {/* Spacer for 2-column alternating layout on desktop */}
                      <div className="flex-1 hidden md:block" />
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: HUNTER GUILD BOUNTY BOARD (RPG DAILY & WEEKLY RAIDS)    */}
      {/* ============================================================== */}
      {activeTab === 'quests' && (
        <div className="space-y-6">
          
          {/* Daily Quests Bounty Board */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>GUILD BOUNTY BOARD · BẢNG TREO THƯỞNG HỘI QUÁN</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Lệnh Treo Thưởng Hằng Ngày
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thực hiện các hành vi rèn luyện thực tế để nhận tiền thưởng Coins và kinh nghiệm XP từ Hội Quán.
                </p>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-black text-emerald-400 flex items-center gap-2">
                <span>ĐÃ HOÀN THÀNH: {todayCompletedQuests} / {todayTotalQuests} LỆNH</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progState.dailyQuests.map((quest, qIdx) => {
                const percent = Math.min(100, Math.round((quest.current / quest.target) * 100));
                const canClaim = quest.isCompleted && !quest.isClaimed;
                const rank = qIdx === 0 ? 'RANK S' : qIdx === 1 ? 'RANK A' : qIdx === 2 ? 'RANK B' : 'RANK C';
                const rankColor = 
                  rank === 'RANK S' ? 'bg-rose-500 text-white' :
                  rank === 'RANK A' ? 'bg-amber-400 text-slate-950' :
                  rank === 'RANK B' ? 'bg-cyan-400 text-slate-950' : 'bg-emerald-500 text-slate-950';

                return (
                  <div
                    key={quest.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      quest.isClaimed
                        ? 'bg-slate-900/60 border-slate-800 opacity-60'
                        : quest.isCompleted
                        ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${rankColor}`}>
                          {rank} BOUNTY
                        </span>

                        <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                          +{quest.rewardCoins} <Coins className="w-3.5 h-3.5" /> · +{quest.rewardXp} XP
                        </span>
                      </div>

                      <h4 className={`text-base font-black ${quest.isClaimed ? 'line-through text-slate-500' : 'text-white'}`}>
                        {quest.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {quest.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>Tiến độ thực hiện</span>
                        <span className="font-mono text-white font-bold">{quest.current} / {quest.target} {quest.unit} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {quest.isClaimed ? '✓ Đã nhận thưởng' : quest.isCompleted ? '⚡ Đã đủ điều kiện nhận!' : 'Chưa đạt chỉ tiêu'}
                        </span>

                        {quest.isClaimed ? (
                          <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
                            ✓ Hoàn Tất
                          </span>
                        ) : canClaim ? (
                          <button
                            onClick={() => handleClaimQuest(quest.key, quest)}
                            disabled={claimingKey === quest.key}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                            <span>{claimingKey === quest.key ? 'Đang nhận...' : 'LĨNH THƯỞNG'}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">
                            Đang rèn luyện
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Challenges Box (EPIC GUILD RAIDS) */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 text-white">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase tracking-wider mb-1">
                <Flame className="w-3.5 h-3.5" />
                <span>WEEKLY GUILD RAIDS · CHIẾN DỊCH TUẦN</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Thử Thách Khối Lượng Cao
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các chiến dịch tuần yêu cầu sức bền dẻo dai tích lũy từ Thứ Hai đến Chủ Nhật.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progState.weeklyChallenges.map((w) => {
                const percent = Math.min(100, Math.round((w.current / w.target) * 100));
                const canClaim = w.isCompleted && !w.isClaimed;

                return (
                  <div
                    key={w.id}
                    className="p-5 rounded-3xl border border-slate-700 bg-slate-800/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-rose-500 text-white">
                          EPIC RAID
                        </span>
                        <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                          +{w.rewardCoins} 🪙 · +{w.rewardXp} XP
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white mt-1">
                        {w.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {w.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>Tiến độ tuần</span>
                        <span className="font-mono text-white font-bold">{w.current} / {w.target} {w.unit} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {w.isClaimed ? '✓ Đã nhận thưởng raid' : canClaim ? '🔥 Sẵn sàng nhận thưởng lớn!' : 'Đang tích lũy'}
                        </span>

                        {w.isClaimed ? (
                          <span className="text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
                            ✓ Hoàn Tất Raid
                          </span>
                        ) : canClaim ? (
                          <button
                            onClick={() => handleClaimChallenge(w.key, w)}
                            disabled={claimingKey === w.key}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition cursor-pointer"
                          >
                            {claimingKey === w.key ? 'Đang nhận...' : 'LĨNH THƯỞNG RAID'}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">
                            Đang tiến hành
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: LIFE BATTLE PASS (SEASON 01: THE AWAKENING)               */}
      {/* ============================================================== */}
      {activeTab === 'battlepass' && (
        <LifeBattlePassTrack userLevel={progState.level} userCoins={progState.coins} />
      )}

      {/* ============================================================== */}
      {/* TAB 3: ACHIEVEMENT SHOWCASE (GALLERY)                          */}
      {/* ============================================================== */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Bộ Sưu Tập Thành Tựu (Achievement Gallery)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các cột mốc dài hạn ghi nhận sự tiến bộ vượt bậc của bạn.
              </p>
            </div>
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {progState.achievements.filter(a => a.isUnlocked).length} / {progState.achievements.length} Đã mở
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progState.achievements.map((ach) => {
              const percent = Math.min(100, Math.round((ach.current / ach.target) * 100));

              return (
                <div
                  key={ach.id}
                  className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                    ach.isUnlocked
                      ? 'border-emerald-500/60 bg-white dark:bg-slate-900 shadow-md ring-1 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-xs">
                        {ach.icon}
                      </div>

                      {ach.isUnlocked ? (
                        <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          ✓ UNLOCKED
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          🔒 LOCKED
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {ach.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Tiến độ</span>
                      <span>{ach.current} / {ach.target} {ach.unit}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ach.isUnlocked ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-right text-[11px] font-bold text-amber-500">
                      +{ach.rewardXp} XP · +{ach.rewardCoins} 🪙
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: REWARD INVENTORY (ARMORY WITH ALL, UNLOCKED, LOCKED)    */}
      {/* ============================================================== */}
      {activeTab === 'armory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-500" />
                <span>Kho Ngoại Trang & Phần Thưởng (Reward Inventory)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mở khóa danh hiệu, khung avatar, huy hiệu bằng Coins kiếm được từ hành động thật.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 text-xs font-black border border-amber-500/20">
                {progState.coins.toLocaleString()} Coins Khả Dụng
              </div>

              {/* Sub-tabs: ALL, UNLOCKED, LOCKED */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
                {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map(tabKey => (
                  <button
                    key={tabKey}
                    onClick={() => setArmoryFilter(tabKey)}
                    className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                      armoryFilter === tabKey
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tabKey}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {progState.cosmeticsCatalog
              .filter(item => {
                if (armoryFilter === 'UNLOCKED') return item.isUnlocked;
                if (armoryFilter === 'LOCKED') return !item.isUnlocked;
                return true;
              })
              .map((item) => {
                const canAfford = progState.coins >= item.costCoins;
                const meetsLevel = progState.level >= item.requiredLevel;

                return (
                  <div
                    key={item.key}
                    className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                      item.isEquipped
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : item.isUnlocked
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.type === 'title' ? 'Danh hiệu' :
                           item.type === 'frame' ? 'Khung đại diện' :
                           item.type === 'badge' ? 'Huy hiệu' : 'Màu chủ đạo'}
                        </span>

                        {item.isEquipped ? (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Đang Dùng
                          </span>
                        ) : item.isUnlocked ? (
                          <span className="text-xs font-bold text-slate-400">
                            ✓ UNLOCKED
                          </span>
                        ) : (
                          <span className="text-xs font-black text-amber-500">
                            {item.costCoins} 🪙
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        {item.icon && <span>{item.icon}</span>}
                        <span>{item.name}</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.requiredLevel > 1 ? `🔒 Lv. ${item.requiredLevel}` : 'Lv. 1'}
                      </span>

                      {item.isEquipped ? (
                        <button
                          disabled
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold opacity-80"
                        >
                          Đang dùng
                        </button>
                      ) : item.isUnlocked ? (
                        <button
                          onClick={() => handleEquipCosmetic(item.type, item.key)}
                          className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          Trang bị
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlockCosmetic(item.key)}
                          disabled={!canAfford || !meetsLevel || purchasingKey === item.key}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition active:scale-95 disabled:opacity-40 cursor-pointer"
                        >
                          {purchasingKey === item.key ? 'Đang mở...' : `Mở khóa (${item.costCoins} 🪙)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: RPG CHARACTER HUB & REAL-LIFE ATTRIBUTES               */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <RPGCharacterHub
            charStats={charStats}
            onOpenAvatarModal={() => setAvatarModalOpen(true)}
            onOpenSkillTree={() => setSkillTreeModalOpen(true)}
            onRefresh={() => fetchAllData(true)}
            frameClass={frameClass}
          />
        </div>
      )}
      {false && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Player Profile Card (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                <input
                  ref={heroAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDirectHeroAvatarUpload}
                  className="hidden"
                />

                {/* Avatar with dynamic frame and hover camera edit overlay */}
                <div 
                  onClick={() => setAvatarModalOpen(true)}
                  className={`w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-4xl font-black text-emerald-400 ${frameClass} shadow-xl relative cursor-pointer group transition transform hover:scale-105`}
                  title="Nhấn để đổi ảnh đại diện anh hùng"
                >
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name || 'Hero Avatar'}
                      className="w-full h-full object-cover rounded-3xl"
                    />
                  ) : (
                    <span>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '⚡'}</span>
                  )}

                  {/* Hover Camera Overlay */}
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-xs rounded-3xl">
                    <Camera className="w-5 h-5 text-emerald-400 mb-0.5" />
                    <span className="text-[10px] font-bold">Đổi ảnh</span>
                  </div>

                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] uppercase shadow-md z-10">
                    LV.{progState.level}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-white">{currentUser?.name || 'Player'}</h3>
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5">{progState.equipped.title}</span>
                  
                  {/* Action buttons to change avatar */}
                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Đổi ảnh đại diện</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => heroAvatarInputRef.current?.click()}
                      disabled={isUploadingHeroAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Tải ảnh trực tiếp từ thiết bị"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingHeroAvatar ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                    </button>
                  </div>

                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>LỰC CHIẾN: {((progState.totalXp * 2) + (progState.currentStreak * 100) + (progState.allTimeStats.totalTasksCompleted * 20) + (progState.allTimeStats.totalFocusMinutes * 5)).toLocaleString()} CP</span>
                  </div>
                </div>
              </div>

              {/* 4 RPG Equipment Gear Slots */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  TRANG BỊ CHIẾN ĐẤU (GEAR LOADOUT)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-sm shrink-0">
                      <Sword className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">VŨ KHÍ</span>
                      <span className="font-bold text-white text-[11px] truncate block">Gươm Hành Động</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">HỘ THUẪN</span>
                      <span className="font-bold text-white text-[11px] truncate block">{progState.currentStreak}d Streak</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">THÁNH THƯ</span>
                      <span className="font-bold text-white text-[11px] truncate block">Tri Thức Lv.{progState.categories.learning.level}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">VƯƠNG MIỆN</span>
                      <span className="font-bold text-white text-[11px] truncate block">{progState.equipped.title}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* XP Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>{progState.totalXp} XP</span>
                  <span>{progState.xpForNextLevel} XP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${Math.max(4, progState.levelProgressPercent)}%` }}
                  />
                </div>
              </div>

              {/* Category Levels Breakdown */}
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">🧠 TRÍ TUỆ (INT)</span>
                  <span className="font-bold text-white">Lv. {progState.categories.learning.level}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">⚡ Ý CHÍ (WILL)</span>
                  <span className="font-bold text-white">Lv. {progState.categories.focus.level}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">🌱 BỀN BỈ (STR)</span>
                  <span className="font-bold text-white">Lv. {progState.categories.habit.level}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-slate-800/50">
                  <span className="text-slate-400">💰 TÀI PHÚ (WEALTH)</span>
                  <span className="font-bold text-white">Lv. {progState.categories.finance.level}</span>
                </div>
              </div>

              {/* Achievements Showcase Icons */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">DANH HIỆU & HUY HIỆU</span>
                <div className="flex flex-wrap gap-2">
                  {progState.achievements.map((a) => (
                    <div
                      key={a.id}
                      title={a.title}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                        a.isUnlocked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {a.icon}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSharePlayerCard}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer mt-4"
            >
              Khoe Player Card
            </button>
          </div>

          {/* Life Stats Breakdown (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* THIS WEEK STATS */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <span>THIS WEEK · TUẦN NÀY</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Công việc xong</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{progState.weeklyStats.tasksCompleted} việc</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Làm việc sâu</span>
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                    {Math.floor(progState.weeklyStats.focusMinutes / 60)}h {progState.weeklyStats.focusMinutes % 60}m
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Học tập</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {progState.weeklyStats.learningMinutes} phút
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Lượt thói quen</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">{progState.weeklyStats.habitsCompleted} lượt</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Tiết kiệm đạt</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(progState.weeklyStats.savingsAmount)}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Chuỗi duy trì</span>
                  <span className="text-lg font-black text-rose-500">{progState.weeklyStats.streakDays} ngày 🔥</span>
                </div>
              </div>
            </div>

            {/* ALL TIME STATS */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>ALL TIME · TOÀN BỘ THỜI GIAN</span>
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Tổng công việc hoàn tất</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{progState.allTimeStats.totalTasksCompleted} tasks</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 block mb-1">Tổng thời gian Focus</span>
                  <span className="text-xl font-black text-teal-600 dark:text-teal-400">{Math.floor(progState.allTimeStats.totalFocusMinutes / 60)} giờ {progState.allTimeStats.totalFocusMinutes % 60}m</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: DÒNG THỜI GIAN CỘT MỐC                                  */}
      {/* ============================================================== */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Nhật Ký Cột Mốc Cuộc Đời ({milestones.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các sự kiện đáng nhớ tự động ghi nhận hoặc do bạn tự ghi chép.
              </p>
            </div>

            <button
              onClick={() => setAddMilestoneOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi Lại Cột Mốc Mới</span>
            </button>
          </div>

          <div className="space-y-3">
            {milestones.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">{formatDate(item.date)}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {item.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{item.title}</h4>
                    {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedMilestoneForShare(item);
                    setShareModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Khoe</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STAGE BATTLE BRIEFING MODAL (RPG 3-STAR & BOSS CHALLENGE)     */}
      {/* ============================================================== */}
      <StageBattleModal
        node={stageBattleNode}
        chapterIndex={selectedChapterIndex}
        chapterTitle={selectedChapter.title}
        onClose={() => setStageBattleNode(null)}
        onGoToModule={(m) => setCurrentView(m)}
      />

      {/* ============================================================== */}
      {/* DAILY MYSTERY CHEST GACHA LOOT REVEAL MODAL                   */}
      {/* ============================================================== */}
      <DailyMysteryChestModal
        isOpen={chestModalOpen}
        onClose={() => setChestModalOpen(false)}
        reward={chestReward}
      />

      {/* ============================================================== */}
      {/* LEVEL UP CELEBRATION MODAL (EXACT SPEC FORMAT)                 */}
      {/* ============================================================== */}
      {levelUpModalOpen && levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-7 text-white text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30">
              ⚡
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-widest block">
                LEVEL UP
              </span>
              <h2 className="text-3xl font-black text-white">
                {levelUpData.fromLevel} → {levelUpData.toLevel}
              </h2>
              <p className="text-base font-extrabold text-amber-400">
                ✨ {levelUpData.title} ✨
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 space-y-2 text-left">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                NEW REWARDS UNLOCKED
              </span>
              <div className="space-y-1 font-semibold text-emerald-300">
                <p>◈ Mở khóa ngoại trang cấp mới trong Armory</p>
                <p>◈ Mở rộng giới hạn nhiệm vụ ngày & tuần</p>
                <p>◈ +{levelUpData.toLevel * 10} Coins thưởng thăng cấp</p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playSuccess();
                setLevelUpModalOpen(false);
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 active:scale-95 transition cursor-pointer"
            >
              [ TIẾP TỤC HÀNH TRÌNH ]
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: THÊM CỘT MỐC THỦ CÔNG                                  */}
      {/* ============================================================== */}
      {addMilestoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ghi Lại Cột Mốc Cá Nhân
              </h3>
              <button onClick={() => setAddMilestoneOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3 pt-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề cột mốc *
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="VD: Chạy bộ 21km, Đọc xong 1 cuốn sách..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Giá trị (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={manualMetric}
                    onChange={(e) => setManualMetric(e.target.value)}
                    placeholder="VD: 21km, 500 từ..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Biểu tượng
                  </label>
                  <select
                    value={manualIcon}
                    onChange={(e) => setManualIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="🏆">🏆 Cúp Vàng</option>
                    <option value="🔥">🔥 Ngọn Lửa</option>
                    <option value="⚡">⚡ Năng Lượng</option>
                    <option value="🎯">🎯 Mục Tiêu</option>
                    <option value="📚">📚 Tri Thức</option>
                    <option value="💰">💰 Tài Chính</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cảm nghĩ / Chi tiết
                </label>
                <textarea
                  rows={2}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Ghi lại cảm xúc khi bạn chinh phục cột mốc này..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMilestoneOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Lưu Cột Mốc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SOCIAL SHARE CARD GENERATOR MODAL                              */}
      {/* ============================================================== */}
      <AchievementShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        milestone={selectedMilestoneForShare}
        userName={currentUser?.name || 'Thành viên LifeOS'}
      />

      {/* ============================================================== */}
      {/* HERO AVATAR CUSTOMIZER MODAL                                   */}
      {/* ============================================================== */}
      <HeroAvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        frameClass={frameClass}
      />

      {/* ============================================================== */}
      {/* RPG MONSTER COMBAT ARENA MODAL                                 */}
      {/* ============================================================== */}
      <MonsterCombatModal
        monster={selectedMonsterForCombat}
        isOpen={combatModalOpen}
        onClose={() => setCombatModalOpen(false)}
        onBattleFinished={() => fetchAllData(true)}
        onGoToTrain={(view) => {
          setCombatModalOpen(false);
          setCurrentView(view as any);
        }}
      />

      {/* ============================================================== */}
      {/* RPG TALENT SKILL TREE MODAL                                    */}
      {/* ============================================================== */}
      <RPGSkillTreeModal
        isOpen={skillTreeModalOpen}
        onClose={() => setSkillTreeModalOpen(false)}
        onSkillUnlocked={() => fetchAllData(true)}
      />

    </div>
  );
}
