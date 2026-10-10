export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  rewardXp: number;
  completed: boolean;
  category: 'task' | 'habit' | 'focus' | 'finance' | 'study';
}

export interface RetentionProfile {
  streak: number;
  bestStreak: number;
  lastActiveDate: string;
  xp: number;
  level: number;
  levelTitle: string;
  progressToNextLevel: number;
  badges: UserBadge[];
  dailyQuests: DailyQuest[];
  todayCompletedCount: number;
}

const LEVEL_TITLES = [
  'Tân Binh (Novice)',
  'Người Khám Phá (Explorer)',
  'Chiến Binh Kỷ Luật (Achiever)',
  'Bậc Thầy Năng Suất (Master)',
  'Huyền Thoại Cuộc Sống (Grandmaster)'
];

const DEFAULT_BADGES: UserBadge[] = [
  {
    id: 'first_task',
    name: 'Khởi Đầu Hoàn Hảo',
    description: 'Hoàn thành công việc đầu tiên trên Life OS',
    icon: '🚀',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'focus_hero',
    name: 'Chiến Thần Tập Trung',
    description: 'Hoàn thành ít nhất 1 phiên Deep Work Pomodoro',
    icon: '⚡',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'streak_3',
    name: 'Tia Lửa Kỷ Luật',
    description: 'Duy trì chuỗi năng suất 3 ngày liên tiếp',
    icon: '🔥',
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'budget_master',
    name: 'Bậc Thầy Ngân Sách',
    description: 'Ghi chép giao dịch tài chính hoặc ví tiền',
    icon: '💰',
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'vocab_scholar',
    name: 'Học Giả Oxford',
    description: 'Ôn tập từ vựng với thuật toán Spaced Repetition',
    icon: '🧠',
    progress: 0,
    maxProgress: 1
  }
];

export const retentionEngine = {
  getStorageKey(userId?: string): string {
    return `lifeos_retention_${userId || 'guest'}`;
  },

  getProfile(userId?: string): RetentionProfile {
    const today = new Date().toISOString().split('T')[0];
    const key = this.getStorageKey(userId);

    let profile: RetentionProfile = {
      streak: 1,
      bestStreak: 1,
      lastActiveDate: today,
      xp: 40,
      level: 1,
      levelTitle: LEVEL_TITLES[0],
      progressToNextLevel: 40,
      badges: DEFAULT_BADGES,
      dailyQuests: [],
      todayCompletedCount: 0
    };

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        profile = { ...profile, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse retention profile:', e);
    }

    // Refresh streak logic against today
    if (profile.lastActiveDate !== today) {
      const last = new Date(profile.lastActiveDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        profile.streak += 1;
        if (profile.streak > profile.bestStreak) {
          profile.bestStreak = profile.streak;
        }
      } else if (diffDays > 1) {
        // Streak broken
        profile.streak = 1;
      }
      profile.lastActiveDate = today;
      profile.todayCompletedCount = 0;
      profile.dailyQuests = this.generateDailyQuests(today);
      this.saveProfile(profile, userId);
    }

    if (!profile.dailyQuests || profile.dailyQuests.length === 0) {
      profile.dailyQuests = this.generateDailyQuests(today);
      this.saveProfile(profile, userId);
    }

    // Recalculate level
    const level = Math.floor(profile.xp / 100) + 1;
    profile.level = level;
    profile.levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
    profile.progressToNextLevel = profile.xp % 100;

    return profile;
  },

  saveProfile(profile: RetentionProfile, userId?: string) {
    try {
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save retention profile:', e);
    }
  },

  generateDailyQuests(dateStr: string): DailyQuest[] {
    return [
      {
        id: `quest_task_${dateStr}`,
        title: 'Hoàn thành ít nhất 1 công việc ưu tiên',
        rewardXp: 25,
        completed: false,
        category: 'task'
      },
      {
        id: `quest_habit_${dateStr}`,
        title: 'Check-in 1 thói quen tích cực',
        rewardXp: 20,
        completed: false,
        category: 'habit'
      },
      {
        id: `quest_focus_${dateStr}`,
        title: 'Thực hiện 1 phiên Deep Work Pomodoro',
        rewardXp: 35,
        completed: false,
        category: 'focus'
      }
    ];
  },

  addXp(amount: number, reason: string, userId?: string): { profile: RetentionProfile; leveledUp: boolean } {
    const profile = this.getProfile(userId);
    const oldLevel = profile.level;
    profile.xp += amount;
    profile.todayCompletedCount += 1;

    const newLevel = Math.floor(profile.xp / 100) + 1;
    const leveledUp = newLevel > oldLevel;

    profile.level = newLevel;
    profile.levelTitle = LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)];
    profile.progressToNextLevel = profile.xp % 100;

    this.saveProfile(profile, userId);
    return { profile, leveledUp };
  },

  unlockBadge(badgeId: string, userId?: string): boolean {
    const profile = this.getProfile(userId);
    const badge = profile.badges.find(b => b.id === badgeId);
    if (badge && !badge.unlockedAt) {
      badge.unlockedAt = new Date().toISOString();
      badge.progress = badge.maxProgress || 1;
      profile.xp += 50; // Bonus XP for unlocking badge
      this.saveProfile(profile, userId);
      return true;
    }
    return false;
  },

  completeQuest(category: 'task' | 'habit' | 'focus' | 'finance' | 'study', userId?: string): boolean {
    const profile = this.getProfile(userId);
    const quest = profile.dailyQuests.find(q => q.category === category && !q.completed);
    if (quest) {
      quest.completed = true;
      this.addXp(quest.rewardXp, quest.title, userId);
      return true;
    }
    return false;
  }
};
