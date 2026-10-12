import { getPrisma } from '../db.js';
import { compute5DHarmony, LifeHarmonyOverview } from '../../lib/lifeHarmonyEngine.js';

export class LifeHarmonyService {
  /**
   * Retrieves and calculates the authentic 5D Harmony score strictly based on the user's real database records.
   * STRICT PRINCIPLE: REAL DATA ONLY (No mock, no random, no fake defaults).
   */
  async get5DHarmony(userId: string): Promise<LifeHarmonyOverview> {
    if (!userId) {
      throw new Error('Thiếu userId khi lấy chỉ số 5D Harmony');
    }

    const prisma = getPrisma();

    // Query all relevant user-owned collections concurrently
    const [
      tasks,
      habits,
      habitRecords,
      focusSessions,
      focusGoals,
      transactions,
      budgets,
      financeAccounts,
      goals
    ] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        select: { id: true, status: true, dueDate: true, priority: true }
      }),
      prisma.habit.findMany({
        where: { userId },
        select: { id: true, name: true, status: true, streak: true, completedDates: true }
      }),
      prisma.habitLog.findMany({
        where: { habit: { userId } },
        select: { id: true, habitId: true, date: true, completed: true }
      }),
      prisma.focusSession.findMany({
        where: { userId },
        select: { id: true, status: true, actualDuration: true, createdAt: true, startTime: true }
      }),
      prisma.focusGoal.findMany({
        where: { userId },
        select: { id: true, type: true, targetHours: true }
      }),
      prisma.transaction.findMany({
        where: { userId },
        select: { id: true, amount: true, type: true, category: true, date: true }
      }),
      prisma.budget.findMany({
        where: { userId },
        select: { id: true, category: true, limit: true, spent: true }
      }),
      prisma.financeAccount.findMany({
        where: { userId },
        select: { id: true, name: true, balance: true }
      }),
      prisma.goal.findMany({
        where: { userId },
        select: { id: true, title: true, status: true, progress: true }
      })
    ]);

    // Format habit records to match frontend structure
    const formattedHabitRecords = habitRecords.map(r => ({
      ...r,
      status: r.completed ? 'Completed' : 'Pending'
    }));

    return compute5DHarmony({
      tasks,
      habits,
      habitRecords: formattedHabitRecords,
      focusSessions,
      focusGoals,
      transactions,
      budgets,
      financeAccounts,
      goals,
      selectedDate: new Date().toISOString().split('T')[0]
    });
  }
}

export const lifeHarmonyService = new LifeHarmonyService();
