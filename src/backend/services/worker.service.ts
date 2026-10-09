import { getPrisma } from '../db.js';

class BackgroundWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRunAt: Date | null = null;

  start(intervalMs: number = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Background Worker Service started (interval:', intervalMs, 'ms)');

    // Run first check immediately after startup
    setTimeout(() => this.tick(), 3000);

    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.isRunning = false;
    console.log('Background Worker Service stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      lastRunAt: this.lastRunAt
    };
  }

  private async tick() {
    this.lastRunAt = new Date();
    try {
      if (!process.env.DATABASE_URL) {
        return;
      }
      const prisma = getPrisma();

      // Graceful DB connectivity check before querying
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (connErr) {
        // DB not ready or starting up; exit tick quietly
        return;
      }

      const now = new Date();

      // 1. Check for expired subscriptions and downgrade plan
      try {
        const expiredUsers = await prisma.user.findMany({
          where: {
            planExpiresAt: { lte: now },
            plan: { not: 'FREE' }
          }
        });

        for (const user of expiredUsers) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { plan: 'FREE', planExpiresAt: null }
            });
            await prisma.notification.create({
              data: {
                userId: user.id,
                title: 'Gói đăng ký đã hết hạn',
                message: 'Gói đăng ký của bạn đã chuyển về gói Miễn phí (FREE). Vui lòng gia hạn để tiếp tục sử dụng các tính năng nâng cao.',
                type: 'warning'
              }
            });
          } catch (err: any) {
            // Ignore single user update failure
          }
        }
      } catch (err: any) {
        // Ignore expired users check failure
      }

      // 2. Overdue task detection & reminders (PERF-002: Optimized batch queries)
      try {
        const todayStr = now.toISOString().split('T')[0];
        const overdueTasks = await prisma.task.findMany({
          where: {
            dueDate: { lt: todayStr },
            status: { notIn: ['Hoàn thành', 'Đã xong', 'Hủy'] }
          },
          include: {
            user: { select: { id: true } }
          },
          take: 50
        });

        if (overdueTasks.length > 0) {
          const userIds = [...new Set(overdueTasks.map(t => t.userId).filter(Boolean))];
          const existingNotes = await prisma.notification.findMany({
            where: {
              userId: { in: userIds },
              title: 'Nhiệm vụ quá hạn'
            },
            select: { userId: true, message: true }
          });

          for (const task of overdueTasks) {
            if (!task.userId || !task.user) continue;

            const safeTitle = (task.title || 'Nhiệm vụ').trim();
            const alreadyNotified = existingNotes.some(
              n => n.userId === task.userId && n.message.includes(safeTitle)
            );

            if (!alreadyNotified) {
              try {
                await prisma.notification.create({
                  data: {
                    userId: task.userId,
                    title: 'Nhiệm vụ quá hạn',
                    message: `Nhiệm vụ "${safeTitle}" đã quá hạn vào ngày ${task.dueDate || todayStr}. Hãy hoàn tất sớm.`,
                    type: 'warning'
                  }
                });
                existingNotes.push({ userId: task.userId, message: safeTitle });
              } catch (err: any) {
                // Ignore single task notification error
              }
            }
          }
        }
      } catch (err: any) {
        // Ignore overdue tasks check failure
      }

      // 3. Budget threshold warnings (PERF-002: Batch filtered & related user included)
      try {
        const exceededBudgets = await prisma.budget.findMany({
          where: {
            limit: { gt: 0 }
          },
          include: {
            user: { select: { id: true } }
          },
          take: 100
        });

        const exceeded = exceededBudgets.filter(b => b.userId && b.user && b.spent >= b.limit);
        if (exceeded.length > 0) {
          const userIds = [...new Set(exceeded.map(b => b.userId))];
          const existingWarnings = await prisma.notification.findMany({
            where: {
              userId: { in: userIds },
              title: 'Cảnh báo vượt ngân sách'
            },
            select: { userId: true, message: true }
          });

          for (const budget of exceeded) {
            const categoryName = (budget.category || 'Danh mục').trim();
            const alreadyWarned = existingWarnings.some(
              w => w.userId === budget.userId && w.message.includes(categoryName)
            );

            if (!alreadyWarned) {
              try {
                await prisma.notification.create({
                  data: {
                    userId: budget.userId,
                    title: 'Cảnh báo vượt ngân sách',
                    message: `Ngân sách danh mục "${categoryName}" đã chạm mức ${budget.spent.toLocaleString()} / ${budget.limit.toLocaleString()} VND.`,
                    type: 'alert'
                  }
                });
                existingWarnings.push({ userId: budget.userId, message: categoryName });
              } catch (err: any) {
                // Ignore single budget notification error
              }
            }
          }
        }
      } catch (err: any) {
        // Ignore budget threshold check failure
      }
    } catch (err: any) {
      // Quiet catch for top-level tick
    }
  }
}

export const workerService = new BackgroundWorker();
