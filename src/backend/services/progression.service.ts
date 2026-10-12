import { getPrisma } from '../db.js';

export interface DailyQuestItem {
  id: string;
  key: string;
  title: string;
  description: string;
  category: 'task' | 'habit' | 'focus' | 'learning' | 'journal';
  current: number;
  target: number;
  unit: string;
  rewardXp: number;
  rewardCoins: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface WeeklyChallengeItem {
  id: string;
  key: string;
  title: string;
  description: string;
  category: 'focus' | 'habit' | 'task';
  current: number;
  target: number;
  unit: string;
  rewardXp: number;
  rewardCoins: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface ChapterNodeItem {
  id: string;
  chapterIndex: number; // 1..5
  title: string;
  description: string;
  requirementText: string;
  category: 'task' | 'habit' | 'focus' | 'learning' | 'finance' | 'overall';
  current: number;
  target: number;
  unit: string;
  status: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED';
  rewardTitle?: string;
  rewardCoins: number;
  rewardXp: number;
}

export interface JourneyChapterItem {
  index: number;
  id: string;
  title: string;
  tagline: string;
  theme: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  progressPercent: number;
  nodes: ChapterNodeItem[];
  chapterReward: {
    title: string;
    coins: number;
    frame?: string;
    badge?: string;
  };
}

export interface CosmeticItem {
  key: string;
  type: 'title' | 'frame' | 'badge' | 'accent';
  name: string;
  description: string;
  icon?: string;
  costCoins: number;
  requiredLevel: number;
  isUnlocked: boolean;
  isEquipped: boolean;
}

export interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  category: 'discipline' | 'focus' | 'learning' | 'finance' | 'productivity';
  icon: string;
  current: number;
  target: number;
  unit: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  rewardXp: number;
  rewardCoins: number;
}

// Level Formula Calculation
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Level formula: Level = floor((totalXp / 100) ^ (1 / 1.5)) + 1
  return Math.max(1, Math.floor(Math.pow(totalXp / 100, 1 / 1.5)) + 1);
}

export function getXpThresholdsForLevel(level: number): { currentLevelStart: number; nextLevelStart: number } {
  const currentLevelStart = level <= 1 ? 0 : Math.floor(100 * Math.pow(level - 1, 1.5));
  const nextLevelStart = Math.floor(100 * Math.pow(level, 1.5));
  return { currentLevelStart, nextLevelStart };
}

export function getTitleForLevel(level: number): string {
  if (level >= 50) return 'Sovereign · Chủ Quyền Cuộc Sống';
  if (level >= 40) return 'Master · Bậc Thầy Làm Chủ';
  if (level >= 30) return 'Architect · Kiến Trúc Sư Đời Mình';
  if (level >= 25) return 'Strategist · Chiến Lược Gia';
  if (level >= 20) return 'Focused · Tập Trung Cao Độ';
  if (level >= 15) return 'Operator · Nhà Vận Hành';
  if (level >= 10) return 'Consistent · Bền Bỉ Kỷ Luật';
  if (level >= 5) return 'Builder · Người Xây Dựng';
  return 'Initiator · Người Khởi Đầu';
}

export const progressionService = {
  /**
   * Khởi tạo hoặc đồng bộ tiến độ thực tế (Zero fake data)
   */
  async getOrCreateProgression(userId: string) {
    const prisma = getPrisma();

    let progression = await prisma.userProgression.findUnique({
      where: { userId }
    });

    if (!progression) {
      // 100% Data thật: Tính từ dữ liệu lịch sử của user
      const [
        completedTasksCount,
        habits,
        focusSessions,
        vocabWordCount,
        savingGoals
      ] = await Promise.all([
        prisma.task.count({
          where: { userId, status: { in: ['Done', 'Hoàn thành', 'completed', 'Completed'] } }
        }),
        prisma.habit.findMany({
          where: { userId },
          select: { streak: true, bestStreak: true, completedDates: true }
        }),
        prisma.focusSession.findMany({
          where: { userId, status: { in: ['Completed', 'completed', 'Hoàn thành'] } },
          select: { actualDuration: true }
        }),
        prisma.vocabWordProgress.count({
          where: { userId, memoryLevel: { gte: 2 } }
        }),
        prisma.savingGoal.findMany({
          where: { userId },
          select: { currentAmount: true, targetAmount: true }
        })
      ]);

      // Tính tổng phút focus thực tế
      const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);

      // Tính tổng lượt hoàn thành thói quen
      let totalHabitChecks = 0;
      let maxStreak = 0;
      habits.forEach(h => {
        let dates: string[] = [];
        try {
          dates = typeof h.completedDates === 'string' ? JSON.parse(h.completedDates) : (h.completedDates || []);
        } catch { dates = []; }
        totalHabitChecks += dates.length;
        if ((h.bestStreak || 0) > maxStreak) maxStreak = h.bestStreak || 0;
        if ((h.streak || 0) > maxStreak) maxStreak = h.streak || 0;
      });

      // Tiết kiệm đạt mốc
      const savingsReached = savingGoals.filter(s => s.currentAmount >= s.targetAmount && s.targetAmount > 0).length;

      // Base XP từ hành động thật
      const taskXp = completedTasksCount * 15;
      const habitXp = totalHabitChecks * 10;
      const focusXp = Math.floor(totalFocusMinutes / 25) * 15;
      const learningXp = vocabWordCount * 5;
      const financeXp = savingsReached * 50;

      const totalXp = taskXp + habitXp + focusXp + learningXp + financeXp;
      const level = getLevelFromXp(totalXp);
      const coins = Math.floor(totalXp / 5) + 50; // Starter coins

      const todayStr = new Date().toISOString().split('T')[0];

      progression = await prisma.userProgression.create({
        data: {
          userId,
          totalXp,
          level,
          coins,
          learningXp,
          learningLevel: getLevelFromXp(learningXp),
          habitXp,
          habitLevel: getLevelFromXp(habitXp),
          focusXp,
          focusLevel: getLevelFromXp(focusXp),
          financeXp,
          financeLevel: getLevelFromXp(financeXp),
          currentStreak: maxStreak,
          longestStreak: maxStreak,
          lastActiveDate: todayStr,
          equippedTitle: getTitleForLevel(level).split(' · ')[0],
          equippedFrame: 'default',
          equippedBadge: 'starter',
          equippedAccent: 'emerald'
        }
      });

      // Tạo transaction mở đầu
      if (totalXp > 0) {
        await prisma.xPTransaction.create({
          data: {
            userId,
            amount: totalXp,
            category: 'milestone',
            source: 'initial_history_sync',
            sourceId: 'sync_bootstrap',
            description: 'Đồng bộ kết quả từ các nỗ lực thực tế trước đó'
          }
        }).catch(() => {});
      }
    }

    return progression;
  },

  /**
   * Cộng XP và Coins có bảo vệ Anti-Cheat & Idempotency
   */
  async awardXp(userId: string, params: {
    amount: number;
    category: 'task' | 'habit' | 'focus' | 'learning' | 'finance' | 'quest' | 'milestone';
    source: string;
    sourceId: string;
    description: string;
  }) {
    const prisma = getPrisma();
    const { amount, category, source, sourceId, description } = params;

    if (amount <= 0) return { awarded: false, reason: 'INVALID_AMOUNT' };

    // Kiểm tra idempotency: Nếu đã cộng XP cho action này rồi thì bỏ qua
    const existingTx = await prisma.xPTransaction.findUnique({
      where: {
        userId_source_sourceId: {
          userId,
          source,
          sourceId
        }
      }
    });

    if (existingTx) {
      return { awarded: false, reason: 'ALREADY_AWARDED', existing: existingTx };
    }

    const prog = await this.getOrCreateProgression(userId);

    const oldLevel = prog.level;
    const newTotalXp = prog.totalXp + amount;
    const newLevel = getLevelFromXp(newTotalXp);
    const leveledUp = newLevel > oldLevel;

    // Coins kiếm được từ hành động thực tế (tỉ lệ: ~1/5 XP, tối thiểu 2 coins)
    const coinReward = Math.max(2, Math.floor(amount / 5));
    const newCoins = prog.coins + coinReward;

    // Cập nhật category XP
    let learningXp = prog.learningXp;
    let habitXp = prog.habitXp;
    let focusXp = prog.focusXp;
    let financeXp = prog.financeXp;

    if (category === 'learning') learningXp += amount;
    else if (category === 'habit') habitXp += amount;
    else if (category === 'focus') focusXp += amount;
    else if (category === 'finance') financeXp += amount;
    else if (category === 'task') focusXp += Math.floor(amount / 2);

    const todayStr = new Date().toISOString().split('T')[0];

    // Cập nhật streak nếu ngày hoạt động mới
    let currentStreak = prog.currentStreak;
    let longestStreak = prog.longestStreak;
    if (prog.lastActiveDate !== todayStr) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (prog.lastActiveDate === yesterday) {
        currentStreak += 1;
      } else if (!prog.lastActiveDate) {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }

    // Ghi nhận transaction song song
    await prisma.$transaction([
      prisma.xPTransaction.create({
        data: {
          userId,
          amount,
          category,
          source,
          sourceId,
          description
        }
      }),
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: coinReward,
          type: 'earn',
          source,
          sourceId,
          description: `Thưởng hoàn thành: ${description}`
        }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: {
          totalXp: newTotalXp,
          level: newLevel,
          coins: newCoins,
          learningXp,
          learningLevel: getLevelFromXp(learningXp),
          habitXp,
          habitLevel: getLevelFromXp(habitXp),
          focusXp,
          focusLevel: getLevelFromXp(focusXp),
          financeXp,
          financeLevel: getLevelFromXp(financeXp),
          currentStreak,
          longestStreak,
          lastActiveDate: todayStr
        }
      })
    ]);

    return {
      awarded: true,
      xpEarned: amount,
      coinsEarned: coinReward,
      oldLevel,
      newLevel,
      leveledUp,
      newTitle: leveledUp ? getTitleForLevel(newLevel) : undefined
    };
  },

  /**
   * Cộng Coins trực tiếp và ghi sổ CoinTransaction
   */
  async addCoins(userId: string, amount: number, source: string, sourceId: string, description: string) {
    const prisma = getPrisma();
    if (amount <= 0) return { awarded: false };

    const prog = await this.getOrCreateProgression(userId);
    await prisma.$transaction([
      prisma.coinTransaction.create({
        data: {
          userId,
          amount,
          type: 'earn',
          source,
          sourceId,
          description
        }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: { coins: { increment: amount } }
      })
    ]);
    return { awarded: true, coinsEarned: amount, newCoins: prog.coins + amount };
  },

  /**
   * Mua và mở khóa mỹ phẩm bằng Coins
   */
  async unlockCosmetic(userId: string, cosmeticKey: string) {
    const prisma = getPrisma();
    const prog = await this.getOrCreateProgression(userId);

    const catalog = this.getCosmeticsCatalog(prog.level);
    const item = catalog.find(c => c.key === cosmeticKey);

    if (!item) throw new Error('Không tìm thấy vật phẩm này trong kho ngoại trang.');
    if (prog.level < item.requiredLevel) throw new Error(`Yêu cầu đạt Level ${item.requiredLevel} để mở khóa.`);
    if (prog.coins < item.costCoins) throw new Error(`Bạn cần ${item.costCoins} Coins (hiện có ${prog.coins} Coins).`);

    // Kiểm tra đã sở hữu chưa
    const existing = await prisma.userReward.findUnique({
      where: { userId_rewardKey: { userId, rewardKey: cosmeticKey } }
    });
    if (existing) throw new Error('Bạn đã mở khóa vật phẩm này rồi.');

    await prisma.$transaction([
      prisma.userProgression.update({
        where: { userId },
        data: { coins: { decrement: item.costCoins } }
      }),
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: -item.costCoins,
          type: 'spend',
          source: 'reward_purchase',
          sourceId: cosmeticKey,
          description: `Mở khóa ngoại trang: ${item.name}`
        }
      }),
      prisma.userReward.create({
        data: {
          userId,
          rewardType: item.type,
          rewardKey: cosmeticKey,
          name: item.name,
          description: item.description,
          icon: item.icon,
          isEquipped: false
        }
      })
    ]);

    return { success: true, item };
  },

  /**
   * Trang bị ngoại trang
   */
  async equipCosmetic(userId: string, rewardType: 'title' | 'frame' | 'badge' | 'accent', rewardKey: string) {
    const prisma = getPrisma();

    // Verify ownership or default
    if (rewardKey !== 'default' && rewardKey !== 'Initiator' && rewardKey !== 'starter' && rewardKey !== 'emerald') {
      const owned = await prisma.userReward.findUnique({
        where: { userId_rewardKey: { userId, rewardKey } }
      });
      if (!owned) throw new Error('Bạn chưa sở hữu ngoại trang này.');
    }

    const updateData: any = {};
    if (rewardType === 'title') updateData.equippedTitle = rewardKey;
    else if (rewardType === 'frame') updateData.equippedFrame = rewardKey;
    else if (rewardType === 'badge') updateData.equippedBadge = rewardKey;
    else if (rewardType === 'accent') updateData.equippedAccent = rewardKey;

    await prisma.$transaction([
      // Reset equip flags for that type
      prisma.userReward.updateMany({
        where: { userId, rewardType },
        data: { isEquipped: false }
      }),
      // Set equip flag
      prisma.userReward.updateMany({
        where: { userId, rewardKey },
        data: { isEquipped: true }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: updateData
      })
    ]);

    return { success: true, equipped: updateData };
  },

  /**
   * Mở Rương Kho Báu Hằng Ngày (Daily Mystery Chest)
   */
  async openDailyChest(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const source = 'daily_chest';
    const sourceId = `chest_${todayStr}`;

    const prisma = getPrisma();
    const existingTx = await prisma.xPTransaction.findUnique({
      where: {
        userId_source_sourceId: {
          userId,
          source,
          sourceId
        }
      }
    });

    if (existingTx) {
      return {
        alreadyClaimed: true,
        message: 'Bạn đã mở rương kho báu hôm nay rồi. Hãy quay lại vào ngày mai!'
      };
    }

    // Gacha RNG probability
    const rand = Math.random() * 100;
    let rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' = 'COMMON';
    let xp = 40;
    let coins = 15;
    let title = 'Rương Du Khách';

    if (rand < 5) {
      rarity = 'LEGENDARY';
      xp = 250;
      coins = 80;
      title = 'Hòm Thần Thoại Cổ Xưa 👑';
    } else if (rand < 20) {
      rarity = 'EPIC';
      xp = 140;
      coins = 45;
      title = 'Hòm Huyền Bí Hoàng Gia 🔮';
    } else if (rand < 50) {
      rarity = 'RARE';
      xp = 80;
      coins = 25;
      title = 'Hòm Chiến Binh Thép ⚔️';
    } else {
      rarity = 'COMMON';
      xp = 45;
      coins = 12;
      title = 'Hòm Du Khách Tinh Anh 🌱';
    }

    const awardResult = await this.awardXp(userId, {
      amount: xp,
      category: 'quest',
      source,
      sourceId,
      description: `Mở ${title} (${rarity})`
    });

    return {
      alreadyClaimed: false,
      rarity,
      xp,
      coins,
      title,
      awardResult
    };
  },

  /**
   * Catalog ngoại trang Gen Z
   */
  getCosmeticsCatalog(userLevel: number): CosmeticItem[] {
    return [
      // TITLES
      { key: 'Initiator', type: 'title', name: 'Initiator (Khởi Đầu)', description: 'Danh hiệu dành cho người dám bắt đầu', costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: 'Builder', type: 'title', name: 'Builder (Xây Dựng)', description: 'Từng bước định hình trật tự cuộc sống', costCoins: 50, requiredLevel: 5, isUnlocked: userLevel >= 5, isEquipped: false },
      { key: 'Consistent', type: 'title', name: 'Consistent (Bền Bỉ)', description: 'Kỷ luật tự giác không cần giám sát', costCoins: 100, requiredLevel: 10, isUnlocked: userLevel >= 10, isEquipped: false },
      { key: 'Focused', type: 'title', name: 'Focused (Tập Trung)', description: 'Khả năng miễn nhiễm trước xao nhãng', costCoins: 180, requiredLevel: 20, isUnlocked: userLevel >= 20, isEquipped: false },
      { key: 'Architect', type: 'title', name: 'Architect (Kiến Trúc Sư)', description: 'Kiến tạo tương lai theo ý chí của mình', costCoins: 300, requiredLevel: 30, isUnlocked: userLevel >= 30, isEquipped: false },
      { key: 'Sovereign', type: 'title', name: 'Sovereign (Chủ Quyền)', description: 'Làm chủ tối thượng vận mệnh cá nhân', costCoins: 500, requiredLevel: 50, isUnlocked: userLevel >= 50, isEquipped: false },

      // AVATAR FRAMES
      { key: 'default', type: 'frame', name: 'Khung Tiêu Chuẩn', description: 'Viền mảnh tối giản thanh lịch', costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: 'frame_emerald_neon', type: 'frame', name: 'Emerald Neon Glow', description: 'Vòng sáng xanh ngọc lục bảo Gen Z', costCoins: 80, requiredLevel: 3, isUnlocked: userLevel >= 3, isEquipped: false },
      { key: 'frame_cyber_cyan', type: 'frame', name: 'Cyber Cyan Pulse', description: 'Viền cyan phát quang công nghệ', costCoins: 120, requiredLevel: 8, isUnlocked: userLevel >= 8, isEquipped: false },
      { key: 'frame_obsidian_gold', type: 'frame', name: 'Obsidian Gold V.I.P', description: 'Hắc diện thạch viền vàng kim vương giả', costCoins: 250, requiredLevel: 15, isUnlocked: userLevel >= 15, isEquipped: false },
      { key: 'frame_amethyst_aura', type: 'frame', name: 'Amethyst Aura Elite', description: 'Hào quang thạch anh tím huyền bí', costCoins: 350, requiredLevel: 25, isUnlocked: userLevel >= 25, isEquipped: false },

      // BADGES
      { key: 'starter', type: 'badge', name: 'Ngôi Sao Khởi Bước', description: 'Dấu ấn ngày đầu gia nhập', icon: '⭐', costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: 'badge_consistency_flame', type: 'badge', name: 'Ngọn Lửa Kỷ Luật', description: 'Biểu tượng của chuỗi streak không ngừng', icon: '🔥', costCoins: 60, requiredLevel: 5, isUnlocked: userLevel >= 5, isEquipped: false },
      { key: 'badge_deep_worker', type: 'badge', name: 'Deep Work Champion', description: 'Huy hiệu của người làm việc sâu', icon: '⚡', costCoins: 150, requiredLevel: 12, isUnlocked: userLevel >= 12, isEquipped: false },
      { key: 'badge_knowledge_sage', type: 'badge', name: 'Bậc Thầy Tri Thức', description: 'Tích lũy từ vựng và bài học liên tục', icon: '🧠', costCoins: 200, requiredLevel: 18, isUnlocked: userLevel >= 18, isEquipped: false },
      { key: 'badge_grand_sovereign', type: 'badge', name: 'Grand Sovereign Crown', description: 'Huy hiệu tối thượng của người làm chủ', icon: '👑', costCoins: 400, requiredLevel: 35, isUnlocked: userLevel >= 35, isEquipped: false },

      // ACCENT THEMES
      { key: 'emerald', type: 'accent', name: 'Emerald Forest (Xanh Ngọc)', description: 'Màu xanh lục bảo biểu tượng cho sự tăng trưởng', costCoins: 0, requiredLevel: 1, isUnlocked: true, isEquipped: false },
      { key: 'indigo', type: 'accent', name: 'Electric Indigo (Chàm Hoàng Gia)', description: 'Tông màu sắc sảo của trí tuệ và chiều sâu', costCoins: 90, requiredLevel: 7, isUnlocked: userLevel >= 7, isEquipped: false },
      { key: 'sunset', type: 'accent', name: 'Sunset Crimson (Hoàng Hôn)', description: 'Năng lượng bùng nổ của ngọn lửa đam mê', costCoins: 120, requiredLevel: 14, isUnlocked: userLevel >= 14, isEquipped: false },
      { key: 'cyan', type: 'accent', name: 'Cyberpunk Cyan (Xanh Điện Biên)', description: 'Sắc neon tương lai của phong cách Gen Z', costCoins: 160, requiredLevel: 21, isUnlocked: userLevel >= 21, isEquipped: false }
    ];
  },

  /**
   * Tính toán toàn bộ Aggregated Progression State từ 100% dữ liệu thực tế
   */
  async getProgressionState(userId: string) {
    const prisma = getPrisma();
    const prog = await this.getOrCreateProgression(userId);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    // 1. Lấy dữ liệu hoạt động hôm nay để đánh giá Daily Quests
    const [
      todayTasksCount,
      habits,
      todayFocusSessions,
      todayVocabReviews,
      todayNotesCount,
      claimedTodayQuestTx,
      ownedRewards,
      recentXpLedger,
      recentCoinLedger,
      allCompletedTasksCount,
      allFocusSessions,
      savingGoals
    ] = await Promise.all([
      // Tasks completed today
      prisma.task.count({
        where: {
          userId,
          status: { in: ['Done', 'Hoàn thành', 'completed', 'Completed'] },
          updatedAt: { gte: todayStart }
        }
      }),
      // Habits
      prisma.habit.findMany({
        where: { userId },
        select: { id: true, name: true, streak: true, bestStreak: true, completedDates: true }
      }),
      // Focus today
      prisma.focusSession.findMany({
        where: {
          userId,
          status: { in: ['Completed', 'completed', 'Hoàn thành'] },
          createdAt: { gte: todayStart }
        },
        select: { actualDuration: true }
      }),
      // Vocab reviews today
      prisma.vocabReviewLog.count({
        where: {
          userId,
          reviewedAt: { gte: todayStart }
        }
      }),
      // Notes today
      prisma.note.count({
        where: {
          userId,
          updatedAt: { gte: todayStart }
        }
      }),
      // Claimed quest transactions today
      prisma.xPTransaction.findMany({
        where: {
          userId,
          source: 'daily_quest',
          createdAt: { gte: todayStart }
        },
        select: { sourceId: true }
      }),
      // Owned user rewards
      prisma.userReward.findMany({
        where: { userId }
      }),
      // Recent XP ledger (audit history)
      prisma.xPTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 12
      }),
      // Recent Coin ledger
      prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8
      }),
      // All completed tasks
      prisma.task.count({
        where: { userId, status: { in: ['Done', 'Hoàn thành', 'completed', 'Completed'] } }
      }),
      // All focus sessions
      prisma.focusSession.findMany({
        where: { userId, status: { in: ['Completed', 'completed', 'Hoàn thành'] } },
        select: { actualDuration: true, createdAt: true }
      }),
      // Saving goals
      prisma.savingGoal.findMany({
        where: { userId },
        select: { currentAmount: true, targetAmount: true }
      })
    ]);

    // Thói quen hôm nay
    let todayHabitsCount = 0;
    habits.forEach(h => {
      let dates: string[] = [];
      try {
        dates = typeof h.completedDates === 'string' ? JSON.parse(h.completedDates) : (h.completedDates || []);
      } catch { dates = []; }
      if (dates.includes(todayStr)) todayHabitsCount++;
    });

    const todayFocusMinutes = todayFocusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    const claimedSet = new Set(claimedTodayQuestTx.map(tx => tx.sourceId));

    // Daily Quests (100% Real Evaluation)
    const dailyQuests: DailyQuestItem[] = [
      {
        id: 'q1',
        key: 'quest_task_2',
        title: 'Xử lý 2 công việc',
        description: 'Hoàn thành 2 nhiệm vụ công việc trong danh sách hôm nay',
        category: 'task',
        current: Math.min(2, todayTasksCount),
        target: 2,
        unit: 'tasks',
        rewardXp: 30,
        rewardCoins: 6,
        isCompleted: todayTasksCount >= 2,
        isClaimed: claimedSet.has(`quest_task_2_${todayStr}`)
      },
      {
        id: 'q2',
        key: 'quest_habit_2',
        title: 'Giữ vững 2 thói quen',
        description: 'Đánh dấu hoàn thành ít nhất 2 thói quen tích cực hôm nay',
        category: 'habit',
        current: Math.min(2, todayHabitsCount),
        target: 2,
        unit: 'habits',
        rewardXp: 25,
        rewardCoins: 5,
        isCompleted: todayHabitsCount >= 2,
        isClaimed: claimedSet.has(`quest_habit_2_${todayStr}`)
      },
      {
        id: 'q3',
        key: 'quest_focus_25',
        title: 'Tập trung sâu 25 phút',
        description: 'Hoàn thành ít nhất một phiên tập trung làm việc chất lượng',
        category: 'focus',
        current: Math.min(25, todayFocusMinutes),
        target: 25,
        unit: 'phút',
        rewardXp: 35,
        rewardCoins: 7,
        isCompleted: todayFocusMinutes >= 25,
        isClaimed: claimedSet.has(`quest_focus_25_${todayStr}`)
      },
      {
        id: 'q4',
        key: 'quest_learning',
        title: 'Nạp tri thức mới',
        description: 'Luyện tập flashcard từ vựng hoặc học một bài học hôm nay',
        category: 'learning',
        current: Math.min(10, todayVocabReviews),
        target: 10,
        unit: 'lượt học',
        rewardXp: 25,
        rewardCoins: 5,
        isCompleted: todayVocabReviews >= 10,
        isClaimed: claimedSet.has(`quest_learning_${todayStr}`)
      },
      {
        id: 'q5',
        key: 'quest_journal',
        title: 'Phản chiếu & Ghi chép',
        description: 'Tạo hoặc cập nhật 1 ghi chú/nhật ký suy ngẫm hôm nay',
        category: 'journal',
        current: Math.min(1, todayNotesCount),
        target: 1,
        unit: 'ghi chú',
        rewardXp: 20,
        rewardCoins: 4,
        isCompleted: todayNotesCount >= 1,
        isClaimed: claimedSet.has(`quest_journal_${todayStr}`)
      }
    ];

    // Weekly Challenges Evaluation (Thực tế tuần này)
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // 1 (Mon) - 7 (Sun)
    const mondayStart = new Date(now);
    mondayStart.setDate(now.getDate() - (dayOfWeek - 1));
    mondayStart.setHours(0, 0, 0, 0);

    const weekNumber = `${now.getFullYear()}_W${Math.ceil((now.getDate() + 6) / 7)}`;

    // Week focus minutes
    const weekFocusMinutes = allFocusSessions
      .filter(s => new Date(s.createdAt) >= mondayStart)
      .reduce((acc, s) => acc + (s.actualDuration || 0), 0);

    // Week tasks
    const weekTasksCount = await prisma.task.count({
      where: {
        userId,
        status: { in: ['Done', 'Hoàn thành', 'completed', 'Completed'] },
        updatedAt: { gte: mondayStart }
      }
    });

    const weeklyChallenges: WeeklyChallengeItem[] = [
      {
        id: 'w1',
        key: 'weekly_focus_150',
        title: 'Chiến Binh Tập Trung (Focus Warrior)',
        description: 'Tích lũy 150 phút làm việc sâu trong tuần này',
        category: 'focus',
        current: Math.min(150, weekFocusMinutes),
        target: 150,
        unit: 'phút',
        rewardXp: 120,
        rewardCoins: 30,
        isCompleted: weekFocusMinutes >= 150,
        isClaimed: claimedSet.has(`weekly_focus_150_${weekNumber}`)
      },
      {
        id: 'w2',
        key: 'weekly_tasks_8',
        title: 'Cỗ Máy Năng Suất (Execution Sprint)',
        description: 'Hoàn thành ít nhất 8 công việc trong tuần',
        category: 'task',
        current: Math.min(8, weekTasksCount),
        target: 8,
        unit: 'việc',
        rewardXp: 100,
        rewardCoins: 25,
        isCompleted: weekTasksCount >= 8,
        isClaimed: claimedSet.has(`weekly_tasks_8_${weekNumber}`)
      }
    ];

    // Journey Chapters & Roadmap Nodes (5 Chapters)
    const totalFocusHours = Math.round(allFocusSessions.reduce((a, b) => a + (b.actualDuration || 0), 0) / 60);
    const maxHabitStreak = Math.max(...habits.map(h => Math.max(h.streak || 0, h.bestStreak || 0)), 0);
    const savingsAchievedCount = savingGoals.filter(s => s.currentAmount >= s.targetAmount && s.targetAmount > 0).length;

    const journeyChapters: JourneyChapterItem[] = [
      {
        index: 1,
        id: 'ch1',
        title: 'Chương 1: Khởi Nguyên (Start)',
        tagline: 'Đặt những viên gạch đầu tiên cho hệ điều hành cuộc sống',
        theme: 'emerald',
        isUnlocked: true,
        isCompleted: allCompletedTasksCount >= 1 && maxHabitStreak >= 1,
        progressPercent: Math.min(100, Math.round(((allCompletedTasksCount >= 1 ? 50 : 0) + (maxHabitStreak >= 1 ? 50 : 0)))),
        nodes: [
          {
            id: 'n1_1',
            chapterIndex: 1,
            title: 'Bước Chân Đầu Tiên',
            description: 'Hoàn thành nhiệm vụ công việc đầu tiên trong hệ thống',
            requirementText: 'Hoàn thành 1 task',
            category: 'task',
            current: Math.min(1, allCompletedTasksCount),
            target: 1,
            unit: 'task',
            status: allCompletedTasksCount >= 1 ? 'COMPLETED' : 'IN_PROGRESS',
            rewardTitle: 'Initiator',
            rewardCoins: 20,
            rewardXp: 50
          },
          {
            id: 'n1_2',
            chapterIndex: 1,
            title: 'Khởi Động Thói Quen',
            description: 'Đánh dấu thói quen kỷ luật đầu tiên',
            requirementText: 'Đạt chuỗi streak >= 1 ngày',
            category: 'habit',
            current: Math.min(1, maxHabitStreak),
            target: 1,
            unit: 'ngày',
            status: maxHabitStreak >= 1 ? 'COMPLETED' : 'IN_PROGRESS',
            rewardCoins: 20,
            rewardXp: 50
          }
        ],
        chapterReward: {
          title: 'Khung Emerald Neon',
          coins: 50,
          frame: 'frame_emerald_neon'
        }
      },
      {
        index: 2,
        id: 'ch2',
        title: 'Chương 2: Kiến Tạo (Build)',
        tagline: 'Thiết lập chuỗi kỷ luật 7 ngày và năng lực làm việc sâu',
        theme: 'indigo',
        isUnlocked: allCompletedTasksCount >= 1,
        isCompleted: maxHabitStreak >= 7 && totalFocusHours >= 3,
        progressPercent: Math.min(100, Math.round((Math.min(7, maxHabitStreak) / 7 * 50) + (Math.min(3, totalFocusHours) / 3 * 50))),
        nodes: [
          {
            id: 'n2_1',
            chapterIndex: 2,
            title: 'Kỷ Luật 7 Ngày Bền Bỉ',
            description: 'Duy trì chuỗi thói quen liên tục trong 7 ngày không ngắt quãng',
            requirementText: 'Chuỗi thói quen >= 7 ngày',
            category: 'habit',
            current: Math.min(7, maxHabitStreak),
            target: 7,
            unit: 'ngày liên tiếp',
            status: maxHabitStreak >= 7 ? 'MASTERED' : (maxHabitStreak > 0 ? 'IN_PROGRESS' : 'LOCKED'),
            rewardTitle: 'Consistent',
            rewardCoins: 50,
            rewardXp: 120
          },
          {
            id: 'n2_2',
            chapterIndex: 2,
            title: 'Tập Trung Sâu (Deep Work)',
            description: 'Tích lũy tối thiểu 3 giờ làm việc sâu với Pomodoro',
            requirementText: '3 giờ tập trung thực tế',
            category: 'focus',
            current: Math.min(3, totalFocusHours),
            target: 3,
            unit: 'giờ',
            status: totalFocusHours >= 3 ? 'COMPLETED' : 'IN_PROGRESS',
            rewardCoins: 40,
            rewardXp: 100
          }
        ],
        chapterReward: {
          title: 'Huy hiệu Consistency Flame',
          coins: 100,
          badge: 'badge_consistency_flame'
        }
      },
      {
        index: 3,
        id: 'ch3',
        title: 'Chương 3: Đột Phá (Focus)',
        tagline: 'Chinh phục 21 ngày phản xạ và mục tiêu tài chính',
        theme: 'sunset',
        isUnlocked: maxHabitStreak >= 7,
        isCompleted: maxHabitStreak >= 21 && savingsAchievedCount >= 1,
        progressPercent: Math.min(100, Math.round((Math.min(21, maxHabitStreak) / 21 * 50) + (Math.min(1, savingsAchievedCount) * 50))),
        nodes: [
          {
            id: 'n3_1',
            chapterIndex: 3,
            title: 'Quy Luật 21 Ngày Thần Kỳ',
            description: 'Biến nỗ lực có ý thức thành bản năng tự nhiên',
            requirementText: 'Chuỗi thói quen >= 21 ngày',
            category: 'habit',
            current: Math.min(21, maxHabitStreak),
            target: 21,
            unit: 'ngày liên tiếp',
            status: maxHabitStreak >= 21 ? 'MASTERED' : (maxHabitStreak >= 7 ? 'IN_PROGRESS' : 'LOCKED'),
            rewardTitle: 'Focused',
            rewardCoins: 80,
            rewardXp: 200
          },
          {
            id: 'n3_2',
            chapterIndex: 3,
            title: 'Cán Mốc Tiết Kiệm',
            description: 'Hoàn thành 100% ít nhất một mục tiêu tích lũy tài chính',
            requirementText: '1 mục tiêu tiết kiệm đạt 100%',
            category: 'finance',
            current: Math.min(1, savingsAchievedCount),
            target: 1,
            unit: 'mục tiêu',
            status: savingsAchievedCount >= 1 ? 'COMPLETED' : 'IN_PROGRESS',
            rewardCoins: 60,
            rewardXp: 150
          }
        ],
        chapterReward: {
          title: 'Khung Obsidian Gold',
          coins: 150,
          frame: 'frame_obsidian_gold'
        }
      },
      {
        index: 4,
        id: 'ch4',
        title: 'Chương 4: Tăng Trưởng (Grow)',
        tagline: 'Mở rộng quy mô công việc và tích lũy tri thức sâu sắc',
        theme: 'cyan',
        isUnlocked: maxHabitStreak >= 21,
        isCompleted: allCompletedTasksCount >= 50 && totalFocusHours >= 15,
        progressPercent: Math.min(100, Math.round((Math.min(50, allCompletedTasksCount) / 50 * 50) + (Math.min(15, totalFocusHours) / 15 * 50))),
        nodes: [
          {
            id: 'n4_1',
            chapterIndex: 4,
            title: '50 Nhiệm Vụ Hoàn Tất',
            description: 'Giải quyết khối lượng công việc đáng kể',
            requirementText: '50 tasks hoàn thành',
            category: 'task',
            current: Math.min(50, allCompletedTasksCount),
            target: 50,
            unit: 'tasks',
            status: allCompletedTasksCount >= 50 ? 'COMPLETED' : 'IN_PROGRESS',
            rewardTitle: 'Strategist',
            rewardCoins: 100,
            rewardXp: 250
          },
          {
            id: 'n4_2',
            chapterIndex: 4,
            title: '15 Giờ Làm Việc Sâu',
            description: 'Xây dựng năng lực tập trung bền bỉ của chuyên gia',
            requirementText: '15 giờ focus session',
            category: 'focus',
            current: Math.min(15, totalFocusHours),
            target: 15,
            unit: 'giờ',
            status: totalFocusHours >= 15 ? 'COMPLETED' : 'IN_PROGRESS',
            rewardCoins: 100,
            rewardXp: 250
          }
        ],
        chapterReward: {
          title: 'Huy hiệu Deep Work Champion',
          coins: 200,
          badge: 'badge_deep_worker'
        }
      },
      {
        index: 5,
        id: 'ch5',
        title: 'Chương 5: Làm Chủ (Master)',
        tagline: 'Đạt tới trạng thái tự chủ toàn diện cuộc đời',
        theme: 'emerald',
        isUnlocked: allCompletedTasksCount >= 50 && totalFocusHours >= 15,
        isCompleted: allCompletedTasksCount >= 100 && maxHabitStreak >= 60,
        progressPercent: Math.min(100, Math.round((Math.min(100, allCompletedTasksCount) / 100 * 50) + (Math.min(60, maxHabitStreak) / 60 * 50))),
        nodes: [
          {
            id: 'n5_1',
            chapterIndex: 5,
            title: 'Bất Khả Xâm Phạm (60 Ngày)',
            description: 'Kỷ luật thép không bị lay chuyển bởi bất kỳ hoàn cảnh nào',
            requirementText: 'Chuỗi thói quen >= 60 ngày',
            category: 'habit',
            current: Math.min(60, maxHabitStreak),
            target: 60,
            unit: 'ngày liên tiếp',
            status: maxHabitStreak >= 60 ? 'MASTERED' : 'IN_PROGRESS',
            rewardTitle: 'Sovereign',
            rewardCoins: 250,
            rewardXp: 500
          },
          {
            id: 'n5_2',
            chapterIndex: 5,
            title: 'Centurion (100 Tasks)',
            description: 'Chinh phục 100 mục tiêu hành động hoàn tất',
            requirementText: '100 tasks hoàn thành',
            category: 'task',
            current: Math.min(100, allCompletedTasksCount),
            target: 100,
            unit: 'tasks',
            status: allCompletedTasksCount >= 100 ? 'MASTERED' : 'IN_PROGRESS',
            rewardCoins: 250,
            rewardXp: 500
          }
        ],
        chapterReward: {
          title: 'Danh hiệu Sovereign & Vương Miện Grand Sovereign',
          coins: 500,
          badge: 'badge_grand_sovereign'
        }
      }
    ];

    // Cosmetics Catalog with equipped & owned status
    const ownedMap = new Map(ownedRewards.map(r => [r.rewardKey, r]));
    const catalog = this.getCosmeticsCatalog(prog.level).map(item => ({
      ...item,
      isUnlocked: item.isUnlocked || ownedMap.has(item.key) || item.costCoins === 0,
      isEquipped: (
        (item.type === 'title' && prog.equippedTitle === item.key) ||
        (item.type === 'frame' && prog.equippedFrame === item.key) ||
        (item.type === 'badge' && prog.equippedBadge === item.key) ||
        (item.type === 'accent' && prog.equippedAccent === item.key)
      )
    }));

    // Level progression thresholds
    const { currentLevelStart, nextLevelStart } = getXpThresholdsForLevel(prog.level);
    const xpSpan = Math.max(1, nextLevelStart - currentLevelStart);
    const xpIntoLevel = Math.max(0, prog.totalXp - currentLevelStart);
    const levelProgressPercent = Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpSpan) * 100)));

    // Category Level details
    const catLevels = {
      learning: {
        xp: prog.learningXp,
        level: prog.learningLevel,
        title: getTitleForLevel(prog.learningLevel).split(' · ')[0],
        percent: Math.min(100, Math.round((prog.learningXp % 300) / 3))
      },
      habit: {
        xp: prog.habitXp,
        level: prog.habitLevel,
        title: getTitleForLevel(prog.habitLevel).split(' · ')[0],
        percent: Math.min(100, Math.round((prog.habitXp % 300) / 3))
      },
      focus: {
        xp: prog.focusXp,
        level: prog.focusLevel,
        title: getTitleForLevel(prog.focusLevel).split(' · ')[0],
        percent: Math.min(100, Math.round((prog.focusXp % 300) / 3))
      },
      finance: {
        xp: prog.financeXp,
        level: prog.financeLevel,
        title: getTitleForLevel(prog.financeLevel).split(' · ')[0],
        percent: Math.min(100, Math.round((prog.financeXp % 300) / 3))
      }
    };

    // Achievements Showcase (Calculated 100% from real database data)
    const totalFocusMinutesAll = allFocusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    const vocabLearnedCount = await prisma.vocabWordProgress.count({ where: { userId, memoryLevel: { gte: 2 } } });
    const totalSavingsAmount = savingGoals.reduce((acc, s) => acc + (s.currentAmount || 0), 0);

    const achievements: AchievementItem[] = [
      {
        id: 'ach_first_step',
        key: 'first_step',
        title: 'FIRST STEP',
        description: 'Hoàn thành nhiệm vụ công việc đầu tiên trên LifeOS',
        category: 'productivity',
        icon: '🌱',
        current: Math.min(1, allCompletedTasksCount),
        target: 1,
        unit: 'task',
        isUnlocked: allCompletedTasksCount >= 1,
        rewardXp: 50,
        rewardCoins: 10
      },
      {
        id: 'ach_7_streak',
        key: '7_day_streak',
        title: '7-DAY STREAK',
        description: 'Duy trì chuỗi hoạt động kỷ luật 7 ngày liên tiếp',
        category: 'discipline',
        icon: '🔥',
        current: Math.min(7, maxHabitStreak),
        target: 7,
        unit: 'ngày liên tiếp',
        isUnlocked: maxHabitStreak >= 7,
        rewardXp: 100,
        rewardCoins: 25
      },
      {
        id: 'ach_deep_worker',
        key: 'deep_worker',
        title: 'DEEP WORKER',
        description: 'Tích lũy tối thiểu 10 giờ làm việc sâu với Pomodoro',
        category: 'focus',
        icon: '⚡',
        current: Math.min(10, Math.floor(totalFocusMinutesAll / 60)),
        target: 10,
        unit: 'giờ',
        isUnlocked: totalFocusMinutesAll >= 600,
        rewardXp: 150,
        rewardCoins: 40
      },
      {
        id: 'ach_consistency_master',
        key: 'consistency_master',
        title: 'CONSISTENCY MASTER',
        description: 'Chinh phục chuỗi thói quen 21 ngày hình thành phản xạ',
        category: 'discipline',
        icon: '🏆',
        current: Math.min(21, maxHabitStreak),
        target: 21,
        unit: 'ngày liên tiếp',
        isUnlocked: maxHabitStreak >= 21,
        rewardXp: 200,
        rewardCoins: 50
      },
      {
        id: 'ach_centurion',
        key: 'task_centurion',
        title: 'TASK CENTURION',
        description: 'Hoàn thành 100 nhiệm vụ công việc hành động',
        category: 'productivity',
        icon: '🛡️',
        current: Math.min(100, allCompletedTasksCount),
        target: 100,
        unit: 'tasks',
        isUnlocked: allCompletedTasksCount >= 100,
        rewardXp: 300,
        rewardCoins: 75
      },
      {
        id: 'ach_knowledge_sage',
        key: 'knowledge_sage',
        title: 'KNOWLEDGE SAGE',
        description: 'Luyện tập thành thạo 50 từ vựng hoặc hoàn thành bài học',
        category: 'learning',
        icon: '🧠',
        current: Math.min(50, vocabLearnedCount),
        target: 50,
        unit: 'từ vựng',
        isUnlocked: vocabLearnedCount >= 50,
        rewardXp: 150,
        rewardCoins: 35
      },
      {
        id: 'ach_wealth_architect',
        key: 'wealth_architect',
        title: 'WEALTH ARCHITECT',
        description: 'Cán mốc 100% mục tiêu tiết kiệm tích lũy tài chính',
        category: 'finance',
        icon: '💰',
        current: Math.min(1, savingsAchievedCount),
        target: 1,
        unit: 'mục tiêu',
        isUnlocked: savingsAchievedCount >= 1,
        rewardXp: 200,
        rewardCoins: 50
      }
    ];

    // Weekly stats
    let weekHabitsCount = 0;
    habits.forEach(h => {
      let dates: string[] = [];
      try {
        dates = typeof h.completedDates === 'string' ? JSON.parse(h.completedDates) : (h.completedDates || []);
      } catch { dates = []; }
      dates.forEach(d => {
        if (new Date(d) >= mondayStart) weekHabitsCount++;
      });
    });

    const weeklyStats = {
      tasksCompleted: weekTasksCount,
      focusMinutes: weekFocusMinutes,
      learningMinutes: todayVocabReviews * 5,
      habitsCompleted: weekHabitsCount,
      savingsAmount: totalSavingsAmount,
      streakDays: prog.currentStreak
    };

    const allTimeStats = {
      totalTasksCompleted: allCompletedTasksCount,
      totalFocusMinutes: totalFocusMinutesAll,
      totalLearningCount: vocabLearnedCount,
      totalHabitsStreak: maxHabitStreak,
      totalSavingsAmount: totalSavingsAmount
    };

    return {
      level: prog.level,
      levelTitle: getTitleForLevel(prog.level),
      totalXp: prog.totalXp,
      xpForCurrentLevel: currentLevelStart,
      xpForNextLevel: nextLevelStart,
      xpNeededForNextLevel: Math.max(0, nextLevelStart - prog.totalXp),
      levelProgressPercent,
      coins: prog.coins,
      currentStreak: prog.currentStreak,
      longestStreak: prog.longestStreak,
      lastActiveDate: prog.lastActiveDate,
      equipped: {
        title: prog.equippedTitle || 'Initiator',
        frame: prog.equippedFrame || 'default',
        badge: prog.equippedBadge || 'starter',
        accent: prog.equippedAccent || 'emerald'
      },
      categories: catLevels,
      dailyQuests,
      weeklyChallenges,
      journeyChapters,
      achievements,
      weeklyStats,
      allTimeStats,
      recentXpLedger,
      recentCoinLedger,
      cosmeticsCatalog: catalog
    };
  },

  /**
   * Claim Daily Quest (Idempotent)
   */
  async claimDailyQuest(userId: string, questKey: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const sourceId = `${questKey}_${todayStr}`;

    const state = await this.getProgressionState(userId);
    const quest = state.dailyQuests.find(q => q.key === questKey);

    if (!quest) throw new Error('Không tìm thấy nhiệm vụ hàng ngày này.');
    if (!quest.isCompleted) throw new Error('Chưa đạt đủ điều kiện hoàn thành nhiệm vụ.');
    if (quest.isClaimed) throw new Error('Nhiệm vụ này đã nhận thưởng hôm nay rồi.');

    return await this.awardXp(userId, {
      amount: quest.rewardXp,
      category: 'quest',
      source: 'daily_quest',
      sourceId,
      description: `Nhiệm vụ ngày: ${quest.title}`
    });
  },

  /**
   * Claim Weekly Challenge (Idempotent)
   */
  async claimWeeklyChallenge(userId: string, challengeKey: string) {
    const now = new Date();
    const weekNumber = `${now.getFullYear()}_W${Math.ceil((now.getDate() + 6) / 7)}`;
    const sourceId = `${challengeKey}_${weekNumber}`;

    const state = await this.getProgressionState(userId);
    const challenge = state.weeklyChallenges.find(c => c.key === challengeKey);

    if (!challenge) throw new Error('Không tìm thấy thử thách tuần này.');
    if (!challenge.isCompleted) throw new Error('Chưa đạt đủ điều kiện hoàn thành thử thách.');
    if (challenge.isClaimed) throw new Error('Thử thách tuần này đã nhận thưởng rồi.');

    return await this.awardXp(userId, {
      amount: challenge.rewardXp,
      category: 'quest',
      source: 'weekly_challenge',
      sourceId,
      description: `Thử thách tuần: ${challenge.title}`
    });
  }
};
