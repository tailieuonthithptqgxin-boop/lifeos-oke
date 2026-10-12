import { getPrisma } from '../db.js';

export interface MilestoneItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category: 'habit' | 'goal' | 'saving' | 'finance' | 'project' | 'study' | 'personal';
  date: string; // YYYY-MM-DD
  icon: string;
  metricValue?: string | null;
  metricLabel?: string | null;
  isHighlighted: boolean;
  isManual: boolean;
  createdAt: string;
}

export interface JourneyOverviewStats {
  memberSinceDays: number;
  joinedDate: string;
  completedTasksCount: number;
  completedGoalsCount: number;
  totalSavedAmount: number;
  bestHabitStreak: number;
  totalFocusMinutes: number;
  masteredVocabCount: number;
  milestonesCount: number;
}

export interface MonthlyRecapStats {
  month: string; // "YYYY-MM"
  monthLabel: string; // "Tháng MM/YYYY"
  tasksCompleted: number;
  habitsCompletedCount: number;
  focusMinutes: number;
  vocabLearned: number;
  savingsProgress: number;
  milestonesInMonth: number;
}

export const journeyService = {
  /**
   * Tính toán toàn bộ thông tin tổng quan, dấu mốc tự động + thủ công của người dùng
   * từ 100% dữ liệu thực tế (Không dùng fake data / math.random)
   */
  async getJourneyData(userId: string) {
    const prisma = getPrisma();

    // 1. Thông tin tài khoản
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, createdAt: true, email: true }
    });

    const joinedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    const now = new Date();
    const memberSinceDays = Math.max(1, Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)));

    // 2. Thu thập dữ liệu thực tế từ các module
    const [
      tasks,
      goals,
      savingGoals,
      habits,
      focusSessions,
      vocabProgress,
      manualMilestones,
      projects
    ] = await Promise.all([
      // Tasks đã hoàn thành
      prisma.task.findMany({
        where: {
          userId,
          status: { in: ['Done', 'Hoàn thành', 'completed', 'Completed'] }
        },
        select: { id: true, title: true, updatedAt: true, createdAt: true }
      }),
      // Goals
      prisma.goal.findMany({
        where: { userId },
        select: { id: true, title: true, status: true, progress: true, targetValue: true, currentValue: true, updatedAt: true }
      }),
      // Saving goals
      prisma.savingGoal.findMany({
        where: { userId },
        select: { id: true, title: true, currentAmount: true, targetAmount: true, updatedAt: true }
      }),
      // Habits
      prisma.habit.findMany({
        where: { userId },
        select: { id: true, name: true, streak: true, bestStreak: true, completedDates: true }
      }),
      // Focus Sessions (Pomodoro)
      prisma.focusSession.findMany({
        where: { userId, status: { in: ['Completed', 'completed', 'Hoàn thành'] } },
        select: { id: true, actualDuration: true, createdAt: true }
      }),
      // Vocab Progress
      prisma.vocabWordProgress.findMany({
        where: { userId },
        select: { id: true, memoryLevel: true, state: true, updatedAt: true }
      }),
      // Manual Milestones
      (prisma as any).journeyMilestone.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
      }),
      // Projects
      prisma.project.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, progress: true, updatedAt: true }
      })
    ]);

    // Thống kê tổng hợp thực tế
    const completedTasksCount = tasks.length;
    const completedGoals = goals.filter(g => g.status === 'Completed' || g.status === 'Hoàn thành' || g.progress >= 100);
    const completedGoalsCount = completedGoals.length;

    let totalSavedAmount = 0;
    savingGoals.forEach(sg => {
      totalSavedAmount += sg.currentAmount || 0;
    });

    let bestHabitStreak = 0;
    habits.forEach(h => {
      const streak = Math.max(h.streak || 0, h.bestStreak || 0);
      if (streak > bestHabitStreak) bestHabitStreak = streak;
    });

    let totalFocusMinutes = 0;
    focusSessions.forEach(f => {
      totalFocusMinutes += Math.round(f.actualDuration || 0);
    });

    const masteredVocabCount = vocabProgress.filter(v => v.memoryLevel >= 4 || v.state === 'mastered').length;

    // 3. Tự động trích xuất các DẤU MỐC ĐÁNG NHỚ từ dữ liệu thực tế
    const autoMilestones: MilestoneItem[] = [];

    // Cột mốc 1: Ngày gia nhập LifeOS
    autoMilestones.push({
      id: `joined_${userId}`,
      userId,
      title: 'Bắt đầu hành trình LifeOS',
      description: 'Ngày đầu tiên khởi tạo không gian phát triển cá nhân',
      category: 'personal',
      date: joinedAt.toISOString().split('T')[0],
      icon: 'Flag',
      metricValue: `${memberSinceDays} ngày`,
      metricLabel: 'Đã gắn bó',
      isHighlighted: true,
      isManual: false,
      createdAt: joinedAt.toISOString()
    });

    // Cột mốc từ Mục tiêu tiết kiệm đạt >= 100% hoặc có tiến độ tốt
    savingGoals.forEach(sg => {
      if (sg.currentAmount >= sg.targetAmount && sg.targetAmount > 0) {
        autoMilestones.push({
          id: `saving_${sg.id}`,
          userId,
          title: `Chạm đích tiết kiệm: ${sg.title}`,
          description: `Đã tích lũy đủ mục tiêu tài chính đề ra`,
          category: 'saving',
          date: (sg.updatedAt ? new Date(sg.updatedAt) : now).toISOString().split('T')[0],
          icon: 'PiggyBank',
          metricValue: `${sg.currentAmount.toLocaleString('vi-VN')} ₫`,
          metricLabel: 'Đã tích lũy',
          isHighlighted: true,
          isManual: false,
          createdAt: (sg.updatedAt ? new Date(sg.updatedAt) : now).toISOString()
        });
      }
    });

    // Cột mốc từ Mục tiêu hoàn thành
    completedGoals.forEach(g => {
      autoMilestones.push({
        id: `goal_${g.id}`,
        userId,
        title: `Hoàn thành mục tiêu: ${g.title}`,
        description: `Chinh phục thành công mục tiêu lớn`,
        category: 'goal',
        date: (g.updatedAt ? new Date(g.updatedAt) : now).toISOString().split('T')[0],
        icon: 'Trophy',
        metricValue: '100%',
        metricLabel: 'Tiến độ',
        isHighlighted: true,
        isManual: false,
        createdAt: (g.updatedAt ? new Date(g.updatedAt) : now).toISOString()
      });
    });

    // Cột mốc từ Thói quen có chuỗi streak xuất sắc (>= 7 ngày)
    habits.forEach(h => {
      const streak = Math.max(h.streak || 0, h.bestStreak || 0);
      if (streak >= 7) {
        autoMilestones.push({
          id: `habit_${h.id}`,
          userId,
          title: `Duy trì kỷ luật: ${h.name}`,
          description: `Giữ vững thói quen tích cực qua từng ngày`,
          category: 'habit',
          date: now.toISOString().split('T')[0],
          icon: 'Flame',
          metricValue: `${streak} ngày`,
          metricLabel: 'Chuỗi liên tiếp',
          isHighlighted: streak >= 21,
          isManual: false,
          createdAt: now.toISOString()
        });
      }
    });

    // Cột mốc từ Dự án hoàn thành
    projects.filter(p => p.progress >= 100 || p.status === 'Hoàn thành' || p.status === 'Completed').forEach(p => {
      autoMilestones.push({
        id: `project_${p.id}`,
        userId,
        title: `Hoàn thành dự án: ${p.name}`,
        description: `Bàn giao và khép lại toàn bộ hạng mục dự án`,
        category: 'project',
        date: (p.updatedAt ? new Date(p.updatedAt) : now).toISOString().split('T')[0],
        icon: 'FolderCheck',
        metricValue: 'Đạt 100%',
        metricLabel: 'Tiến độ dự án',
        isHighlighted: false,
        isManual: false,
        createdAt: (p.updatedAt ? new Date(p.updatedAt) : now).toISOString()
      });
    });

    // Cột mốc học từ vựng (nếu >= 20 từ thành thạo)
    if (masteredVocabCount >= 20) {
      autoMilestones.push({
        id: `vocab_${userId}_mastered`,
        userId,
        title: 'Nấc thang từ vựng & trí nhớ',
        description: 'Đã đưa các từ vựng vào bộ nhớ dài hạn với Spaced Repetition',
        category: 'study',
        date: now.toISOString().split('T')[0],
        icon: 'BookOpen',
        metricValue: `${masteredVocabCount} từ`,
        metricLabel: 'Thành thạo',
        isHighlighted: true,
        isManual: false,
        createdAt: now.toISOString()
      });
    }

    // Cột mốc hoàn thành công việc lớn (mỗi mốc 25 tasks)
    if (completedTasksCount >= 25) {
      autoMilestones.push({
        id: `tasks_${userId}_milestone`,
        userId,
        title: 'Năng suất hành động vượt trội',
        description: 'Đã giải quyết số lượng lớn đầu việc và duy trì đà tiến độ',
        category: 'personal',
        date: now.toISOString().split('T')[0],
        icon: 'CheckCircle2',
        metricValue: `${completedTasksCount} việc`,
        metricLabel: 'Đã hoàn thành',
        isHighlighted: completedTasksCount >= 50,
        isManual: false,
        createdAt: now.toISOString()
      });
    }

    // Kết hợp cột mốc tự động + cột mốc thủ công
    const mappedManualMilestones: MilestoneItem[] = manualMilestones.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      title: m.title,
      description: m.description,
      category: m.category,
      date: m.date,
      icon: m.icon || 'Sparkles',
      metricValue: m.metricValue,
      metricLabel: m.metricLabel,
      isHighlighted: m.isHighlighted,
      isManual: true,
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()
    }));

    // Sắp xếp dòng thời gian theo ngày giảm dần (mới nhất lên đầu)
    const allMilestones = [...mappedManualMilestones, ...autoMilestones].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // 4. Monthly Recap cho 6 tháng gần nhất
    const monthlyRecaps: MonthlyRecapStats[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = `Tháng ${monthNum}/${year}`;

      const tasksInMonth = tasks.filter(t => {
        const tDate = t.updatedAt ? new Date(t.updatedAt) : new Date(t.createdAt);
        return tDate.getFullYear() === year && tDate.getMonth() === d.getMonth();
      }).length;

      const focusInMonth = focusSessions.filter(f => {
        const fDate = new Date(f.createdAt);
        return fDate.getFullYear() === year && fDate.getMonth() === d.getMonth();
      }).reduce((acc, curr) => acc + Math.round(curr.actualDuration || 0), 0);

      const milestonesInMonth = allMilestones.filter(m => m.date.startsWith(monthKey)).length;

      monthlyRecaps.push({
        month: monthKey,
        monthLabel,
        tasksCompleted: tasksInMonth,
        habitsCompletedCount: 0,
        focusMinutes: focusInMonth,
        vocabLearned: 0,
        savingsProgress: 0,
        milestonesInMonth
      });
    }

    const overview: JourneyOverviewStats = {
      memberSinceDays,
      joinedDate: joinedAt.toLocaleDateString('vi-VN'),
      completedTasksCount,
      completedGoalsCount,
      totalSavedAmount,
      bestHabitStreak,
      totalFocusMinutes,
      masteredVocabCount,
      milestonesCount: allMilestones.length
    };

    return {
      overview,
      milestones: allMilestones,
      monthlyRecaps,
      user: {
        name: user?.name || 'Bạn',
        email: user?.email || ''
      }
    };
  },

  /**
   * Thêm một cột mốc thành tựu thủ công
   */
  async createManualMilestone(userId: string, data: {
    title: string;
    description?: string;
    category?: string;
    date: string;
    icon?: string;
    metricValue?: string;
    metricLabel?: string;
    isHighlighted?: boolean;
  }) {
    const prisma = getPrisma();
    return await (prisma as any).journeyMilestone.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category: data.category || 'personal',
        date: data.date,
        icon: data.icon || 'Sparkles',
        metricValue: data.metricValue?.trim() || null,
        metricLabel: data.metricLabel?.trim() || null,
        isHighlighted: Boolean(data.isHighlighted),
        isManual: true
      }
    });
  },

  /**
   * Xóa một cột mốc thủ công
   */
  async deleteManualMilestone(userId: string, milestoneId: string) {
    const prisma = getPrisma();
    return await (prisma as any).journeyMilestone.deleteMany({
      where: {
        id: milestoneId,
        userId
      }
    });
  }
};
