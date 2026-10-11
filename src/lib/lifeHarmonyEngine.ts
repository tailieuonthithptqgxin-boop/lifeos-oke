// Life Harmony Radar & Scoring Engine for LifeOS
// Computes holistic balance across 5 dimensions: Tasks, Habits, Study/Focus, Finance, Goals

export interface LifeHarmonyDimension {
  dimension: string;
  name: string;
  score: number;
  fullMark: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  insight: string;
}

export interface LifeHarmonyOverview {
  overallScore: number;
  rankTitle: string;
  avatarMood: string;
  dimensions: LifeHarmonyDimension[];
}

export function computeLifeHarmony(params: {
  completedTasks: number;
  totalTasks: number;
  completedHabits: number;
  totalHabits: number;
  focusMinutesToday: number;
  todayExpense: number;
  monthlyExpenseBudget?: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
}): LifeHarmonyOverview {
  const {
    completedTasks,
    totalTasks,
    completedHabits,
    totalHabits,
    focusMinutesToday,
    todayExpense,
    activeGoalsCount,
    completedGoalsCount
  } = params;

  // 1. Productivity (Tasks) [0 - 100]
  let taskScore = 70;
  if (totalTasks > 0) {
    taskScore = Math.min(100, Math.round((completedTasks / totalTasks) * 100));
  }

  // 2. Discipline (Habits) [0 - 100]
  let habitScore = 65;
  if (totalHabits > 0) {
    habitScore = Math.min(100, Math.round((completedHabits / totalHabits) * 100));
  }

  // 3. Focus & Growth (Study / Pomodoro) [Target: 60 mins]
  const focusScore = Math.min(100, Math.round((focusMinutesToday / 60) * 100)) || 50;

  // 4. Financial Wellness [Safe limit: < 500k/day default]
  let financeScore = 85;
  if (todayExpense > 1000000) {
    financeScore = 45;
  } else if (todayExpense > 500000) {
    financeScore = 65;
  }

  // 5. Vision & Goals [Active tracking]
  const totalGoals = activeGoalsCount + completedGoalsCount;
  let goalScore = 60;
  if (totalGoals > 0) {
    goalScore = Math.min(100, Math.round(((completedGoalsCount * 2 + activeGoalsCount) / (totalGoals * 2)) * 100));
  }

  const getGrade = (score: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  const dimensions: LifeHarmonyDimension[] = [
    {
      dimension: 'productivity',
      name: 'Năng suất',
      score: taskScore,
      fullMark: 100,
      grade: getGrade(taskScore),
      insight: taskScore >= 80 ? 'Hoàn thành công việc xuất sắc!' : 'Cần giải quyết thêm việc tồn đọng.'
    },
    {
      dimension: 'discipline',
      name: 'Kỷ luật',
      score: habitScore,
      fullMark: 100,
      grade: getGrade(habitScore),
      insight: habitScore >= 80 ? 'Chuỗi thói quen rất vững chắc!' : 'Đừng bỏ quên các thói quen hàng ngày.'
    },
    {
      dimension: 'growth',
      name: 'Phát triển',
      score: focusScore,
      fullMark: 100,
      grade: getGrade(focusScore),
      insight: focusMinutesToday >= 45 ? 'Tập trung sâu rất tuyệt vời!' : 'Hãy dành thêm 25 phút Pomodoro.'
    },
    {
      dimension: 'finance',
      name: 'Tài chính',
      score: financeScore,
      fullMark: 100,
      grade: getGrade(financeScore),
      insight: financeScore >= 80 ? 'Kiểm soát dòng tiền thông minh.' : 'Chi tiêu hôm nay hơi cao.'
    },
    {
      dimension: 'vision',
      name: 'Mục tiêu',
      score: goalScore,
      fullMark: 100,
      grade: getGrade(goalScore),
      insight: activeGoalsCount > 0 ? 'Đang bám sát lộ trình dài hạn.' : 'Hãy đặt thêm mục tiêu quý.'
    }
  ];

  const overallScore = Math.round(
    (taskScore * 0.25) +
    (habitScore * 0.25) +
    (focusScore * 0.2) +
    (financeScore * 0.15) +
    (goalScore * 0.15)
  );

  let rankTitle = 'Tân Binh Đời Sống 🌱';
  let avatarMood = 'idle';
  if (overallScore >= 88) {
    rankTitle = 'Cao Thủ Cân Bằng Cuộc Sống 👑';
    avatarMood = 'celebrate';
  } else if (overallScore >= 75) {
    rankTitle = 'Nhà Tối Ưu Năng Suất ⚡';
    avatarMood = 'motivate';
  } else if (overallScore >= 60) {
    rankTitle = 'Đang Vào Phom Kỷ Luật ✨';
    avatarMood = 'idle';
  }

  return {
    overallScore,
    rankTitle,
    avatarMood,
    dimensions
  };
}
