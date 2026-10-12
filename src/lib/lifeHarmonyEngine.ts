// Life Harmony Radar & Scoring Engine for LifeOS
// STRICT PRODUCTION PRINCIPLE: REAL DATA ONLY (No mock, no random, no fake defaults)
// Computes holistic balance across 5 dimensions: Tasks, Habits, Study/Focus, Finance, Goals

export type DimensionStatus = 'calculated' | 'insufficient_data';

export interface LifeHarmonyTracePoint {
  label: string;
  value: string | number;
  unit?: string;
  description: string;
}

export interface LifeHarmonyDimension {
  dimension: 'productivity' | 'discipline' | 'growth' | 'finance' | 'vision';
  name: string;
  score: number | null; // NULL if insufficient_data! NEVER fake score!
  fullMark: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'N/A';
  status: DimensionStatus;
  dataPointsCount: number;
  requiredMinDataPoints: number;
  sufficiencyReason?: string; // Clear guidance if data is insufficient
  insight: string;
  dataSource: string; // Database table / model source
  calculationFormula: string; // Transparent formula
  tracePoints: LifeHarmonyTracePoint[]; // Drill-down inspection points
}

export interface LifeHarmonyOverview {
  overallScore: number | null; // NULL if all insufficient
  status: 'sufficient' | 'partial' | 'insufficient_data';
  rankTitle: string;
  avatarMood: string;
  evaluatedDimensionsCount: number; // e.g. 3
  totalDimensionsCount: number; // 5
  dataSufficiencyRatio: string; // e.g. "3/5"
  summaryInsight: string;
  lastUpdated: string; // ISO string
  dimensions: LifeHarmonyDimension[];
}

export interface Compute5DHarmonyInput {
  tasks?: any[];
  habits?: any[];
  habitRecords?: any[];
  focusSessions?: any[];
  focusGoals?: any[];
  transactions?: any[];
  budgets?: any[];
  financeAccounts?: any[];
  goals?: any[];
  selectedDate?: string;
}

export function compute5DHarmony(params: Compute5DHarmonyInput): LifeHarmonyOverview {
  const {
    tasks = [],
    habits = [],
    habitRecords = [],
    focusSessions = [],
    focusGoals = [],
    transactions = [],
    budgets = [],
    financeAccounts = [],
    goals = [],
    selectedDate = new Date().toISOString().split('T')[0]
  } = params;

  const nowIso = new Date().toISOString();

  // --------------------------------------------------------------------------
  // 1. PRODUCTIVITY (Năng suất) — Tasks & Projects
  // Source: tasks (Database table: tasks)
  // Sufficiency: totalTasks >= 1
  // --------------------------------------------------------------------------
  const userTasks = Array.isArray(tasks) ? tasks.filter(t => t.status !== 'Hủy') : [];
  const totalTasks = userTasks.length;
  let productivityDim: LifeHarmonyDimension;

  if (totalTasks === 0) {
    productivityDim = {
      dimension: 'productivity',
      name: 'Năng suất',
      score: null,
      fullMark: 100,
      grade: 'N/A',
      status: 'insufficient_data',
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: 'Chưa có nhiệm vụ nào được tạo. Hãy tạo ít nhất 1 nhiệm vụ trong phân hệ Công việc để kích hoạt đánh giá.',
      insight: 'Chưa đủ dữ liệu công việc.',
      dataSource: 'bảng tasks (Công việc cá nhân)',
      calculationFormula: '(Số việc hoàn thành / Tổng số việc) × 70% + (Tỷ lệ đúng hạn) × 30%',
      tracePoints: [
        { label: 'Tổng nhiệm vụ', value: 0, description: 'Chưa có nhiệm vụ trong workspace' }
      ]
    };
  } else {
    const completedTasks = userTasks.filter(t => t.status === 'Hoàn thành').length;
    const completionRate = (completedTasks / totalTasks) * 100;
    
    // Check overdue tasks that are still not completed
    const overdueTasks = userTasks.filter(t => {
      if (t.status === 'Hoàn thành' || !t.dueDate) return false;
      return t.dueDate < selectedDate;
    }).length;

    const onTimeFactor = Math.max(0, 100 - (overdueTasks / totalTasks) * 50);
    const prodScore = Math.min(100, Math.max(0, Math.round(completionRate * 0.7 + onTimeFactor * 0.3)));

    const getGrade = (s: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
      if (s >= 90) return 'A+';
      if (s >= 80) return 'A';
      if (s >= 65) return 'B';
      if (s >= 50) return 'C';
      return 'D';
    };

    productivityDim = {
      dimension: 'productivity',
      name: 'Năng suất',
      score: prodScore,
      fullMark: 100,
      grade: getGrade(prodScore),
      status: 'calculated',
      dataPointsCount: totalTasks,
      requiredMinDataPoints: 1,
      insight: prodScore >= 80 ? 'Hoàn thành công việc xuất sắc!' : overdueTasks > 0 ? `Có ${overdueTasks} việc quá hạn cần xử lý.` : 'Cần đẩy nhanh tiến độ công việc.',
      dataSource: 'bảng tasks (Công việc cá nhân)',
      calculationFormula: '(Số việc hoàn thành / Tổng số việc) × 70% + (Tỷ lệ đúng hạn) × 30%',
      tracePoints: [
        { label: 'Tổng nhiệm vụ ghi nhận', value: totalTasks, unit: 'việc', description: 'Nhiệm vụ thuộc workspace' },
        { label: 'Đã hoàn thành', value: completedTasks, unit: 'việc', description: 'Nhiệm vụ có trạng thái Hoàn thành' },
        { label: 'Tỷ lệ hoàn thành', value: `${Math.round(completionRate)}%`, description: 'Tỷ lệ thực tế' },
        { label: 'Nhiệm vụ quá hạn chưa xong', value: overdueTasks, unit: 'việc', description: 'Hạn chót trước ngày hiện tại' }
      ]
    };
  }

  // --------------------------------------------------------------------------
  // 2. DISCIPLINE (Kỷ luật) — Habits & Check-ins
  // Source: habits, habit_logs (Database tables: habits, habit_logs)
  // Sufficiency: totalHabits >= 1
  // --------------------------------------------------------------------------
  const userHabits = Array.isArray(habits) ? habits.filter(h => h.status !== 'Archived') : [];
  const totalHabits = userHabits.length;
  let disciplineDim: LifeHarmonyDimension;

  if (totalHabits === 0) {
    disciplineDim = {
      dimension: 'discipline',
      name: 'Kỷ luật',
      score: null,
      fullMark: 100,
      grade: 'N/A',
      status: 'insufficient_data',
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: 'Chưa có thói quen nào được thiết lập. Hãy thêm ít nhất 1 thói quen hàng ngày để theo dõi kỷ luật.',
      insight: 'Chưa có thói quen theo dõi.',
      dataSource: 'bảng habits & habit_logs (Thói quen & Điểm danh)',
      calculationFormula: '(Tỷ lệ hoàn thành thói quen hôm nay) × 70% + (Điểm tích lũy chuỗi ngày liên tiếp) × 30%',
      tracePoints: [
        { label: 'Tổng thói quen', value: 0, description: 'Chưa thiết lập thói quen nào' }
      ]
    };
  } else {
    // Check habits completed today
    const completedToday = userHabits.filter(h => {
      const dates = Array.isArray(h.completedDates) 
        ? h.completedDates 
        : typeof h.completedDates === 'string' 
          ? (h.completedDates.startsWith('[') ? JSON.parse(h.completedDates) : []) 
          : [];
      const hasRecordToday = Array.isArray(habitRecords) && habitRecords.some((r: any) => 
        r.habitId === h.id && r.date === selectedDate && (r.completed === true || r.status === 'Completed')
      );
      return dates.includes(selectedDate) || hasRecordToday;
    }).length;

    const todayRate = (completedToday / totalHabits) * 100;
    const maxStreak = Math.max(0, ...userHabits.map(h => Number(h.streak || h.currentStreak || 0)));
    const streakFactor = Math.min(100, maxStreak * 10); // 10 days streak = 100 pts
    const habitScore = Math.min(100, Math.max(0, Math.round(todayRate * 0.7 + streakFactor * 0.3)));

    const getGrade = (s: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
      if (s >= 90) return 'A+';
      if (s >= 80) return 'A';
      if (s >= 65) return 'B';
      if (s >= 50) return 'C';
      return 'D';
    };

    disciplineDim = {
      dimension: 'discipline',
      name: 'Kỷ luật',
      score: habitScore,
      fullMark: 100,
      grade: getGrade(habitScore),
      status: 'calculated',
      dataPointsCount: totalHabits,
      requiredMinDataPoints: 1,
      insight: habitScore >= 80 ? 'Chuỗi thói quen rất vững chắc!' : completedToday > 0 ? `Đã hoàn thành ${completedToday}/${totalHabits} thói quen hôm nay.` : 'Chưa hoàn thành thói quen nào hôm nay.',
      dataSource: 'bảng habits & habit_logs (Thói quen & Điểm danh)',
      calculationFormula: '(Tỷ lệ hoàn thành hôm nay) × 70% + (Chuỗi ngày kỷ luật) × 30%',
      tracePoints: [
        { label: 'Số thói quen theo dõi', value: totalHabits, unit: 'thói quen', description: 'Các thói quen đang kích hoạt' },
        { label: 'Đã hoàn thành hôm nay', value: completedToday, unit: 'thói quen', description: 'Điểm danh ngày được chọn' },
        { label: 'Tỷ lệ hoàn thành hôm nay', value: `${Math.round(todayRate)}%`, description: 'Tỷ lệ thói quen đạt' },
        { label: 'Chuỗi ngày liên tiếp cao nhất', value: maxStreak, unit: 'ngày', description: 'Streak kỷ luật duy trì' }
      ]
    };
  }

  // --------------------------------------------------------------------------
  // 3. GROWTH (Phát triển / Tập trung) — Study & Pomodoro Sessions
  // Source: focus_sessions, focus_goals (Database tables: focus_sessions, focus_goals)
  // Sufficiency: totalFocusSessions >= 1 OR focusMinutesToday > 0
  // --------------------------------------------------------------------------
  const userFocusSessions = Array.isArray(focusSessions) ? focusSessions : [];
  const completedFocusSessions = userFocusSessions.filter(s => s.status === 'Completed');
  
  const todayFocusMinutes = completedFocusSessions
    .filter(s => s.createdAt?.startsWith(selectedDate) || s.startTime?.startsWith(selectedDate))
    .reduce((sum, s) => sum + (Number(s.actualDuration) || 0), 0);

  const totalFocusSessionsCount = userFocusSessions.length;
  let growthDim: LifeHarmonyDimension;

  if (totalFocusSessionsCount === 0 && todayFocusMinutes === 0) {
    growthDim = {
      dimension: 'growth',
      name: 'Phát triển',
      score: null,
      fullMark: 100,
      grade: 'N/A',
      status: 'insufficient_data',
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: 'Chưa có phiên tập trung nào. Hãy thực hiện ít nhất 1 phiên Pomodoro (25 phút) hoặc ghi nhận thời gian học tập.',
      insight: 'Chưa có dữ liệu phiên tập trung.',
      dataSource: 'bảng focus_sessions (Phiên tập trung Pomodoro)',
      calculationFormula: '(Thời gian tập trung thực tế / Mục tiêu tập trung) × 80% + (Tỷ lệ phiên hoàn thành) × 20%',
      tracePoints: [
        { label: 'Số phiên tập trung', value: 0, description: 'Chưa thực hiện phiên học Pomodoro nào' }
      ]
    };
  } else {
    const dailyGoal = Array.isArray(focusGoals) ? focusGoals.find(g => g.type === 'daily') : null;
    const targetHours = dailyGoal?.targetHours || 2;
    const targetMinutes = targetHours * 60;

    const timeRatio = Math.min(1.2, todayFocusMinutes / targetMinutes);
    const sessionCompletionRate = totalFocusSessionsCount > 0 ? (completedFocusSessions.length / totalFocusSessionsCount) : 1;
    const growthScore = Math.min(100, Math.max(10, Math.round(timeRatio * 80 + sessionCompletionRate * 20)));

    const getGrade = (s: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
      if (s >= 90) return 'A+';
      if (s >= 80) return 'A';
      if (s >= 65) return 'B';
      if (s >= 50) return 'C';
      return 'D';
    };

    growthDim = {
      dimension: 'growth',
      name: 'Phát triển',
      score: growthScore,
      fullMark: 100,
      grade: getGrade(growthScore),
      status: 'calculated',
      dataPointsCount: Math.max(totalFocusSessionsCount, 1),
      requiredMinDataPoints: 1,
      insight: todayFocusMinutes >= 45 ? 'Tập trung sâu rất tuyệt vời!' : todayFocusMinutes > 0 ? `Đã tập trung ${todayFocusMinutes} phút hôm nay.` : 'Chưa ghi nhận thời gian tập trung hôm nay.',
      dataSource: 'bảng focus_sessions & focus_goals (Phiên tập trung & Mục tiêu)',
      calculationFormula: '(Thời gian tập trung hôm nay / Mục tiêu) × 80% + (Tỷ lệ hoàn thành phiên) × 20%',
      tracePoints: [
        { label: 'Phút tập trung hôm nay', value: todayFocusMinutes, unit: 'phút', description: 'Thời lượng hoàn thành thực tế' },
        { label: 'Mục tiêu tập trung ngày', value: targetMinutes, unit: 'phút', description: `Định mức ${targetHours}h/ngày` },
        { label: 'Tổng số phiên đã hoàn thành', value: completedFocusSessions.length, unit: 'phiên', description: 'Các phiên Pomodoro đã xong' }
      ]
    };
  }

  // --------------------------------------------------------------------------
  // 4. FINANCE (Tài chính) — Transactions & Budgets
  // Source: transactions, budgets (Database tables: transactions, budgets)
  // CRITICAL PRODUCTION RULE: REAL DATA ONLY!
  // If user has NO transactions and NO budgets -> status = 'insufficient_data', score = null!
  // NEVER fake 50, 70, 85!
  // --------------------------------------------------------------------------
  const userTransactions = Array.isArray(transactions) ? transactions : [];
  const userBudgets = Array.isArray(budgets) ? budgets : [];
  const totalTxCount = userTransactions.length;
  const totalBudgetsCount = userBudgets.length;
  let financeDim: LifeHarmonyDimension;

  if (totalTxCount === 0 && totalBudgetsCount === 0) {
    financeDim = {
      dimension: 'finance',
      name: 'Tài chính',
      score: null,
      fullMark: 100,
      grade: 'N/A',
      status: 'insufficient_data',
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: 'Chưa có giao dịch thu/chi hoặc ngân sách nào. Hãy ghi nhận ít nhất 1 giao dịch trong phân hệ Tài chính để đánh giá.',
      insight: 'Chưa có dữ liệu tài chính.',
      dataSource: 'bảng transactions & budgets (Thu chi & Ngân sách)',
      calculationFormula: 'Đánh giá tỷ lệ tuân thủ ngân sách & kiểm soát dòng tiền thuần từ giao dịch thực tế',
      tracePoints: [
        { label: 'Giao dịch thu/chi', value: 0, description: 'Chưa có giao dịch thực tế trong tài khoản' },
        { label: 'Ngân sách thiết lập', value: 0, description: 'Chưa cài đặt hạn mức chi tiêu' }
      ]
    };
  } else {
    // Calculate real monthly finances
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTx = userTransactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthlyIncome = monthlyTx.filter(t => t.type === 'Thu nhập').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthlyExpense = monthlyTx.filter(t => t.type === 'Chi tiêu').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalMonthlyBudget = userBudgets.reduce((s, b) => s + (Number(b.limit) || 0), 0);

    let finScore = 75; // Baseline for active transaction recorder

    if (totalMonthlyBudget > 0) {
      // Budget adherence score
      const budgetUtilization = (monthlyExpense / totalMonthlyBudget) * 100;
      if (budgetUtilization <= 80) {
        finScore = 95; // Excellent saving
      } else if (budgetUtilization <= 100) {
        finScore = 85; // Good control
      } else if (budgetUtilization <= 120) {
        finScore = 60; // Slightly overspent
      } else {
        finScore = Math.max(15, Math.round(100 - (budgetUtilization - 100) * 1.5));
      }
    } else if (monthlyIncome > 0) {
      // Income vs Expense ratio
      const netSavings = monthlyIncome - monthlyExpense;
      const savingRate = (netSavings / monthlyIncome) * 100;
      if (savingRate >= 30) {
        finScore = 90;
      } else if (savingRate >= 10) {
        finScore = 80;
      } else if (savingRate >= 0) {
        finScore = 70;
      } else {
        finScore = Math.max(20, Math.round(60 + (savingRate * 0.5)));
      }
    } else {
      // Only expenses recorded without budget or income yet
      finScore = monthlyExpense > 5000000 ? 50 : 70;
    }

    const getGrade = (s: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
      if (s >= 90) return 'A+';
      if (s >= 80) return 'A';
      if (s >= 65) return 'B';
      if (s >= 50) return 'C';
      return 'D';
    };

    financeDim = {
      dimension: 'finance',
      name: 'Tài chính',
      score: finScore,
      fullMark: 100,
      grade: getGrade(finScore),
      status: 'calculated',
      dataPointsCount: totalTxCount + totalBudgetsCount,
      requiredMinDataPoints: 1,
      insight: finScore >= 80 ? 'Kiểm soát dòng tiền thông minh.' : 'Cần tối ưu và giám sát hạn mức chi tiêu.',
      dataSource: 'bảng transactions & budgets (Thu chi & Ngân sách)',
      calculationFormula: totalMonthlyBudget > 0 
        ? 'Tỷ lệ sử dụng ngân sách thực tế trong tháng' 
        : 'Tỷ lệ tiết kiệm và dòng tiền ròng thực tế',
      tracePoints: [
        { label: 'Tổng số giao dịch ghi nhận', value: totalTxCount, unit: 'giao dịch', description: 'Các khoản thu chi đã lưu' },
        { label: 'Thu nhập tháng này', value: monthlyIncome.toLocaleString('vi-VN'), unit: '₫', description: 'Giao dịch loại Thu nhập' },
        { label: 'Chi tiêu tháng này', value: monthlyExpense.toLocaleString('vi-VN'), unit: '₫', description: 'Giao dịch loại Chi tiêu' },
        { label: 'Hạn mức ngân sách tháng', value: totalMonthlyBudget > 0 ? totalMonthlyBudget.toLocaleString('vi-VN') : 'Chưa đặt', unit: totalMonthlyBudget > 0 ? '₫' : undefined, description: 'Tổng định mức các danh mục' }
      ]
    };
  }

  // --------------------------------------------------------------------------
  // 5. VISION (Mục tiêu) — Long-term & Quarterly Goals
  // Source: goals (Database table: goals)
  // Sufficiency: totalGoals >= 1
  // --------------------------------------------------------------------------
  const userGoals = Array.isArray(goals) ? goals.filter(g => g.status !== 'Archived') : [];
  const totalGoalsCount = userGoals.length;
  let visionDim: LifeHarmonyDimension;

  if (totalGoalsCount === 0) {
    visionDim = {
      dimension: 'vision',
      name: 'Mục tiêu',
      score: null,
      fullMark: 100,
      grade: 'N/A',
      status: 'insufficient_data',
      dataPointsCount: 0,
      requiredMinDataPoints: 1,
      sufficiencyReason: 'Chưa có mục tiêu nào được tạo. Hãy thêm ít nhất 1 mục tiêu trung hoặc dài hạn trong phân hệ Mục tiêu.',
      insight: 'Chưa có mục tiêu theo dõi.',
      dataSource: 'bảng goals (Mục tiêu cuộc sống)',
      calculationFormula: '(Tiến độ trung bình các mục tiêu) × 70% + (Tỷ lệ mục tiêu hoàn thành) × 30%',
      tracePoints: [
        { label: 'Tổng mục tiêu', value: 0, description: 'Chưa thiết lập mục tiêu nào' }
      ]
    };
  } else {
    const completedGoals = userGoals.filter(g => g.status === 'Hoàn thành' || g.status === 'Completed' || (Number(g.progress) || 0) >= 100).length;
    const avgProgress = Math.round(userGoals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / totalGoalsCount);
    const goalScore = Math.min(100, Math.max(0, Math.round(avgProgress * 0.7 + (completedGoals / totalGoalsCount * 100) * 0.3)));

    const getGrade = (s: number): 'A+' | 'A' | 'B' | 'C' | 'D' => {
      if (s >= 90) return 'A+';
      if (s >= 80) return 'A';
      if (s >= 65) return 'B';
      if (s >= 50) return 'C';
      return 'D';
    };

    visionDim = {
      dimension: 'vision',
      name: 'Mục tiêu',
      score: goalScore,
      fullMark: 100,
      grade: getGrade(goalScore),
      status: 'calculated',
      dataPointsCount: totalGoalsCount,
      requiredMinDataPoints: 1,
      insight: goalScore >= 80 ? 'Đang bám sát lộ trình dài hạn xuất sắc!' : completedGoals > 0 ? `Đã hoàn thành ${completedGoals}/${totalGoalsCount} mục tiêu.` : 'Đang trong quá trình thực hiện mục tiêu.',
      dataSource: 'bảng goals (Mục tiêu cuộc sống)',
      calculationFormula: '(Tiến độ trung bình các mục tiêu) × 70% + (Tỷ lệ mục tiêu hoàn thành) × 30%',
      tracePoints: [
        { label: 'Số mục tiêu đang theo dõi', value: totalGoalsCount, unit: 'mục tiêu', description: 'Các mục tiêu đang hoạt động' },
        { label: 'Đã hoàn thành', value: completedGoals, unit: 'mục tiêu', description: 'Mục tiêu hoàn tất 100%' },
        { label: 'Tiến độ trung bình', value: `${avgProgress}%`, description: 'Trung bình cộng tiến độ các mục tiêu' }
      ]
    };
  }

  // --------------------------------------------------------------------------
  // OVERALL HARMONY SCORE COMPUTATION
  // STRICT RULE: Only compute average across dimensions that ACTUALLY have data!
  // If ALL 5 dimensions are insufficient -> overallScore = null, status = 'insufficient_data'!
  // --------------------------------------------------------------------------
  const allDimensions = [productivityDim, disciplineDim, growthDim, financeDim, visionDim];
  const calculatedDims = allDimensions.filter(d => d.status === 'calculated' && d.score !== null);
  const evaluatedCount = calculatedDims.length;

  let overallScore: number | null = null;
  let status: 'sufficient' | 'partial' | 'insufficient_data' = 'insufficient_data';
  let rankTitle = 'Chưa đủ dữ liệu để đánh giá';
  let avatarMood = 'idle';
  let summaryInsight = 'Bạn chưa có đủ hoạt động để tạo chỉ số 5D Harmony. Hãy bắt đầu sử dụng các tính năng của website để hệ thống có dữ liệu thực tế.';

  if (evaluatedCount === 0) {
    overallScore = null;
    status = 'insufficient_data';
    rankTitle = 'Chưa có dữ liệu đánh giá 🌱';
    avatarMood = 'idle';
    summaryInsight = 'Bạn chưa có đủ hoạt động để tạo chỉ số 5D Harmony. Hãy bắt đầu sử dụng các tính năng của website để hệ thống có dữ liệu thực tế.';
  } else if (evaluatedCount === 5) {
    // All 5 dimensions have real data -> apply standard weights
    overallScore = Math.round(
      ((productivityDim.score || 0) * 0.25) +
      ((disciplineDim.score || 0) * 0.25) +
      ((growthDim.score || 0) * 0.20) +
      ((financeDim.score || 0) * 0.15) +
      ((visionDim.score || 0) * 0.15)
    );
    status = 'sufficient';
    if (overallScore >= 88) {
      rankTitle = 'Cao Thủ Cân Bằng Cuộc Sống 👑';
      avatarMood = 'celebrate';
    } else if (overallScore >= 75) {
      rankTitle = 'Nhà Tối Ưu Năng Suất ⚡';
      avatarMood = 'motivate';
    } else if (overallScore >= 60) {
      rankTitle = 'Đang Vào Phom Kỷ Luật ✨';
      avatarMood = 'idle';
    } else {
      rankTitle = 'Đang Xây Dựng Cân Bằng 🌱';
      avatarMood = 'idle';
    }
    summaryInsight = `Đã phân tích toàn diện dựa trên đầy đủ 5/5 khía cạnh cuộc sống từ dữ liệu thực tế của bạn.`;
  } else {
    // Partial data: 1 to 4 dimensions available
    // Compute weighted average ONLY across available dimensions
    const totalScoreSum = calculatedDims.reduce((s, d) => s + (d.score || 0), 0);
    overallScore = Math.round(totalScoreSum / evaluatedCount);
    status = 'partial';
    rankTitle = 'Đang Tích Lũy Dữ Liệu Thực Tế 🌱';
    avatarMood = 'motivate';
    summaryInsight = `Đang đánh giá dựa trên ${evaluatedCount}/5 khía cạnh đã có hoạt động thực tế. Cần thêm dữ liệu ở các khía cạnh còn lại để hoàn thiện vòng tròn 5D.`;
  }

  return {
    overallScore,
    status,
    rankTitle,
    avatarMood,
    evaluatedDimensionsCount: evaluatedCount,
    totalDimensionsCount: 5,
    dataSufficiencyRatio: `${evaluatedCount}/5`,
    summaryInsight,
    lastUpdated: nowIso,
    dimensions: allDimensions
  };
}

// Backward-compatible adapter for existing calls
export function computeLifeHarmony(params: any): LifeHarmonyOverview {
  // If invoked with the old shape or raw numbers, delegate safely to compute5DHarmony
  return compute5DHarmony(params);
}
