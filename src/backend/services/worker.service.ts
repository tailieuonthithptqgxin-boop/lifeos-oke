import { getPrisma } from '../db.js';
import { gmailService } from './gmailNotification.service.js';

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
            const oldPlan = user.plan;
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

            // Send Gmail notification about expiration
            if (user.email) {
              gmailService.sendNotification({
                to: user.email,
                recipientName: user.name || 'Quý khách',
                subject: `⏳ [Life OS] Gói đăng ký ${oldPlan} của bạn đã hết hạn`,
                category: 'SUBSCRIPTION',
                headline: 'Gói dịch vụ đã kết thúc chu kỳ',
                content: `Gói tài khoản <strong>${oldPlan}</strong> của bạn đã hết thời hạn sử dụng. Tài khoản hiện đã được chuyển về gói <strong>Miễn phí (FREE)</strong>.<br/><br/>Để tiếp tục sử dụng đầy đủ các tính năng thông minh không giới hạn, bạn vui lòng gia hạn hoặc nâng cấp gói mới.`,
                actionLabel: 'Gia hạn gói dịch vụ',
                actionUrl: 'http://localhost:5173',
                badgeText: 'Hết hạn gói',
                badgeColor: '#f59e0b'
              }).catch(e => console.error('[Gmail Worker] Expiry email error:', e));
            }
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
            user: { select: { id: true, name: true, email: true } }
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

                // Send Gmail notification
                if (task.user.email) {
                  gmailService.sendNotification({
                    to: task.user.email,
                    recipientName: task.user.name || 'Bạn',
                    subject: `⏰ [Life OS] Nhắc việc: Nhiệm vụ "${safeTitle}" đã quá hạn`,
                    category: 'TASK_OVERDUE',
                    headline: 'Nhiệm vụ của bạn đã quá hạn deadline',
                    content: `Nhiệm vụ <strong>"${safeTitle}"</strong> (hạn chót: <strong>${task.dueDate || todayStr}</strong>) hiện vẫn chưa được hoàn thành.<br/><br/>Ưu tiên: <strong>${task.priority || 'Trung bình'}</strong>. Hãy mở ứng dụng để kiểm tra và cập nhật tiến độ công việc ngay hôm nay.`,
                    actionLabel: 'Xem nhiệm vụ ngay',
                    actionUrl: 'http://localhost:5173',
                    badgeText: 'Quá hạn',
                    badgeColor: '#ef4444'
                  }).catch(e => console.error('[Gmail Worker] Task overdue email error:', e));
                }
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
            user: { select: { id: true, name: true, email: true } }
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

                // Send Gmail notification
                if (budget.user?.email) {
                  gmailService.sendNotification({
                    to: budget.user.email,
                    recipientName: budget.user.name || 'Bạn',
                    subject: `⚠️ [Life OS] Cảnh báo tài chính: Vượt ngân sách "${categoryName}"`,
                    category: 'BUDGET_ALERT',
                    headline: 'Chi tiêu đã chạm hoặc vượt ngân sách định mức',
                    content: `Danh mục <strong>"${categoryName}"</strong> của bạn đã chi tiêu <strong>${budget.spent.toLocaleString('vi-VN')} ₫</strong>, vượt qua hạn mức dự kiến <strong>${budget.limit.toLocaleString('vi-VN')} ₫</strong>.<br/><br/>Hãy rà soát lại các khoản chi tiêu gần đây để cân đối tài chính cá nhân hiệu quả hơn.`,
                    actionLabel: 'Kiểm tra sổ chi tiêu',
                    actionUrl: 'http://localhost:5173',
                    badgeText: 'Cảnh báo ngân sách',
                    badgeColor: '#f97316'
                  }).catch(e => console.error('[Gmail Worker] Budget alert email error:', e));
                }
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
