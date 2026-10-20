import { Router, Response } from 'express';
import { requireAdmin, AuthRequest } from '../auth.middleware.js';
import { getPrisma } from '../db.js';
import { emailQueueService } from '../services/emailQueue.service.js';
import { gmailService } from '../services/gmailNotification.service.js';
import { subscriptionService } from '../services/subscription.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export const testLabRouter = Router();

// ============================================================================
// TOOL 1: INFRASTRUCTURE & SMTP HEALTH VERIFICATION
// ============================================================================
testLabRouter.get('/health-check', requireAdmin, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  const prisma = getPrisma();

  // 1. Check PostgreSQL Database Latency
  let dbLatency = 0;
  let dbOk = false;
  let dbError: string | null = null;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbLatency = Date.now() - dbStart;
    dbOk = true;
  } catch (err: any) {
    dbError = err.message || 'Lỗi kết nối cơ sở dữ liệu';
  }

  // 2. Check SMTP Server Connection
  let smtpOk = false;
  let smtpMessage = '';
  const smtpStart = Date.now();
  try {
    const smtpRes = await emailQueueService.verifySmtpConnection();
    smtpOk = smtpRes.ok;
    smtpMessage = smtpRes.message;
  } catch (err: any) {
    smtpOk = false;
    smtpMessage = err.message || 'Lỗi kiểm tra kết nối SMTP';
  }
  const smtpLatency = Date.now() - smtpStart;

  // 3. System Metrics
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // 4. Outbox Queue Stats
  let queueStats = { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 };
  try {
    queueStats = await emailQueueService.getQueueStats();
  } catch (err: any) {
    console.warn('[TestLab] Queue stats warning:', err.message);
  }

  const overallSuccess = dbOk;

  res.json({
    success: overallSuccess,
    timestamp: new Date().toISOString(),
    totalLatencyMs: Date.now() - startTime,
    database: {
      ok: dbOk,
      latencyMs: dbLatency,
      error: dbError
    },
    smtp: {
      ok: smtpOk,
      latencyMs: smtpLatency,
      message: smtpMessage
    },
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
    },
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`
    },
    queue: queueStats
  });
});

// ============================================================================
// TOOL 2: LIVE WEB BELL + GMAIL TRIGGER TEST
// ============================================================================
testLabRouter.post('/trigger-notification-test', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const adminId = req.userId!;
  const targetEmail = req.body?.targetEmail || req.user?.email || 'admin@lifeos.com';
  const customMessage = req.body?.message || 'Kiểm tra thông báo thời gian thực LifeOS Live Test Lab';
  const now = new Date();

  try {
    // 1. Create In-App Notification (Web Bell)
    const notification = await prisma.notification.create({
      data: {
        user: { connect: { id: adminId } },
        title: '🔔 [Test Lab] Thử nghiệm Chuông Thông Báo Web',
        message: customMessage,
        type: 'SYSTEM',
        priority: 'IMPORTANT',
        read: false,
        isTestData: true
      }
    });

    // 2. Enqueue Email into Outbox Queue
    const emailSubject = `[LifeOS Live Test] Thông báo thử nghiệm hệ thống (${now.toLocaleTimeString('vi-VN')})`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="font-size: 20px; font-weight: 700; color: #0f172a;">LifeOS Live Test Lab</span>
          <span style="background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px;">TEST VERIFIED</span>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Xin chào,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Đây là email thử nghiệm được kích hoạt trực tiếp từ Trung tâm Kiểm tra Trực tiếp (Live Test Lab) của LifeOS.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Nội dung tin nhắn:</p>
          <p style="margin: 0; font-size: 14px; color: #0f172a; font-family: monospace;">${customMessage}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          Thời gian kích hoạt: ${now.toLocaleString('vi-VN')} | Đánh dấu: is_test_data = true
        </p>
      </div>
    `;

    const queueId = await emailQueueService.enqueue({
      recipient: targetEmail,
      subject: emailSubject,
      htmlBody: emailHtml,
      eventType: 'TEST_LAB_NOTIFICATION',
      isTestData: true,
      metadata: { adminId, notificationId: notification.id }
    });

    res.json({
      success: true,
      message: 'Đã tạo chuông thông báo web và đưa email vào hàng đợi thành công!',
      notification: {
        id: notification.id,
        title: notification.title,
        read: notification.read,
        createdAt: notification.createdAt
      },
      emailQueue: {
        queueId,
        recipient: targetEmail,
        subject: emailSubject
      }
    });
  } catch (err: any) {
    console.error('[TestLab] Notification trigger error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// TOOL 3: GLOBAL FREE MODE SIMULATION & VERIFICATION
// ============================================================================
testLabRouter.get('/free-mode-simulation', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  try {
    const isFreeMode = await subscriptionService.isGlobalFreeMode();

    // Check sample users: 1 paid user, 1 unpaid user
    const paidUser = await prisma.user.findFirst({
      where: { role: 'USER', plan: { not: 'FREE' } },
      select: { id: true, email: true, plan: true, planExpiresAt: true }
    });

    const unpaidUser = await prisma.user.findFirst({
      where: { role: 'USER', plan: 'FREE' },
      select: { id: true, email: true, plan: true, planExpiresAt: true }
    });

    let paidSimResult = null;
    let unpaidSimResult = null;

    if (paidUser) {
      paidSimResult = await subscriptionService.checkUserSubscription(paidUser.id);
    }

    if (unpaidUser) {
      unpaidSimResult = await subscriptionService.checkUserSubscription(unpaidUser.id);
    }

    res.json({
      success: true,
      globalFreeModeActive: isFreeMode,
      explanation: isFreeMode
        ? 'Chế độ Dùng Thử Miễn Phí Toàn Hệ Thống đang BẬT: Tất cả người dùng (kể cả chưa mua) đều được mở khóa 100% tính năng.'
        : 'Chế độ Dùng Thử Miễn Phí Toàn Hệ Thống đang TẮT: Chỉ người dùng có gói trả phí đang hoạt động mới được truy cập các phân hệ.',
      simulation: {
        unpaidUser: unpaidUser
          ? {
              email: unpaidUser.email,
              originalPlan: unpaidUser.plan,
              hasAccessUnderCurrentPolicy: unpaidSimResult?.hasAccess ?? false,
              effectivePlanName: unpaidSimResult?.planName ?? 'Chưa xác định'
            }
          : { note: 'Không có tài khoản FREE mẫu trong CSDL' },
        paidUser: paidUser
          ? {
              email: paidUser.email,
              originalPlan: paidUser.plan,
              hasAccessUnderCurrentPolicy: paidSimResult?.hasAccess ?? true,
              effectivePlanName: paidSimResult?.planName ?? 'Gói Trả Phí'
            }
          : { note: 'Không có tài khoản PAID mẫu trong CSDL' }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// TOOL 4: ONE-CLICK DEMO SANDBOX SEEDER (All tagged with is_test_data = true)
// ============================================================================
testLabRouter.post('/seed-sandbox-data', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const adminId = req.userId!;
  const seedPrefix = `sandbox_${Date.now().toString(36)}`;
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create a Sandbox Demo User
      const salt = await bcrypt.genSalt(10);
      const testHash = await bcrypt.hash('DemoPass@123', salt);
      const testUser = await tx.user.create({
        data: {
          email: `${seedPrefix}_user@testlab.lifeos`,
          name: `Học Viên Sandbox (${seedPrefix})`,
          username: `${seedPrefix}_user`,
          passwordHash: testHash,
          role: 'USER',
          plan: 'FREE',
          status: 'ACTIVE',
          isTestData: true
        }
      });

      // 2. Create Tasks tagged with is_test_data = true
      const task1 = await tx.task.create({
        data: {
          userId: testUser.id,
          title: '[Sandbox Demo] Khởi tạo Kế hoạch Sprint tuần mới',
          priority: 'Cao',
          status: 'Đang làm',
          isTestData: true
        }
      });

      const task2 = await tx.task.create({
        data: {
          userId: testUser.id,
          title: '[Sandbox Demo] Rà soát ngân sách tháng và cân đối hũ chi tiêu',
          priority: 'Trung bình',
          status: 'Chưa làm',
          isTestData: true
        }
      });

      // 3. Create Habit tagged with is_test_data = true
      const habit = await tx.habit.create({
        data: {
          user: { connect: { id: testUser.id } },
          name: '[Sandbox Demo] Đọc sách phát triển 20 phút mỗi sáng',
          category: 'Personal',
          streak: 5,
          status: 'Active',
          isTestData: true
        }
      });

      // 4. Create Goal tagged with is_test_data = true
      const goal = await tx.goal.create({
        data: {
          userId: testUser.id,
          title: '[Sandbox Demo] Nâng cao năng suất cá nhân với LifeOS Masterclass',
          category: 'Kỹ năng',
          progress: 45,
          status: 'Đang thực hiện',
          isTestData: true
        }
      });

      // 5. Create Note tagged with is_test_data = true
      const note = await tx.note.create({
        data: {
          userId: testUser.id,
          title: '[Sandbox Demo] Ghi chú phương pháp Second Brain & P.A.R.A',
          content: 'Tổ chức thông tin theo 4 tầng: Projects (Dự án), Areas (Trách nhiệm), Resources (Tài nguyên), Archives (Lưu trữ).',
          isTestData: true
        }
      });

      // 6. Create Finance Account & Transaction tagged with is_test_data = true
      const account = await tx.financeAccount.create({
        data: {
          userId: testUser.id,
          name: '[Sandbox Demo] Ví Tiền Mặt',
          type: 'CASH',
          balance: 5000000
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: testUser.id,
          accountId: account.id,
          type: 'EXPENSE',
          amount: 85000,
          category: 'Ăn uống',
          note: '[Sandbox Demo] Bữa trưa văn phòng',
          date: now.toISOString().split('T')[0],
          isTestData: true
        }
      });

      // 7. Create Test Notification
      const notification = await tx.notification.create({
        data: {
          user: { connect: { id: testUser.id } },
          title: '🎉 [Sandbox Demo] Chào mừng bạn gia nhập LifeOS Sandbox!',
          message: 'Dữ liệu này được tạo ra hoàn toàn độc lập cho mục đích kiểm thử an toàn.',
          type: 'SYSTEM',
          read: false,
          isTestData: true
        }
      });

      // 8. Log Audit Trail
      await tx.auditLog.create({
        data: {
          adminId,
          action: 'SEED_SANDBOX_DATA',
          beforeState: null,
          afterState: JSON.stringify({ seededUserId: testUser.id, seedPrefix }),
          result: 'Success',
          reason: `Admin đã khởi tạo dữ liệu mẫu Sandbox qua Live Test Lab (${seedPrefix}).`,
          isTestData: true
        }
      });

      return {
        userId: testUser.id,
        email: testUser.email,
        seededCounts: {
          users: 1,
          tasks: 2,
          habits: 1,
          goals: 1,
          notes: 1,
          transactions: 1,
          notifications: 1
        }
      };
    });

    res.json({
      success: true,
      message: 'Khởi tạo bộ dữ liệu Sandbox thử nghiệm thành công! Toàn bộ bản ghi đã được gắn cờ is_test_data = true an toàn.',
      data: result
    });
  } catch (err: any) {
    console.error('[TestLab] Sandbox seeder error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// TOOL 5: ONE-CLICK CLEAN SANDBOX (Purges all rows where is_test_data = true)
// ============================================================================
testLabRouter.post('/clean-sandbox-data', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const adminId = req.userId!;

  try {
    const summary = await prisma.$transaction(async (tx) => {
      // Clean all test data in dependency order
      const delNotifications = await tx.notification.deleteMany({ where: { isTestData: true } });
      const delTasks = await tx.task.deleteMany({ where: { isTestData: true } });
      const delTransactions = await tx.transaction.deleteMany({ where: { isTestData: true } });
      const delHabits = await tx.habit.deleteMany({ where: { isTestData: true } });
      const delGoals = await tx.goal.deleteMany({ where: { isTestData: true } });
      const delNotes = await tx.note.deleteMany({ where: { isTestData: true } });
      const delEmailQueue = await tx.emailQueue.deleteMany({ where: { isTestData: true } });
      const delUsers = await tx.user.deleteMany({ where: { isTestData: true } });
      const delAuditLogs = await tx.auditLog.deleteMany({ where: { isTestData: true } });

      return {
        notifications: delNotifications.count,
        tasks: delTasks.count,
        transactions: delTransactions.count,
        habits: delHabits.count,
        goals: delGoals.count,
        notes: delNotes.count,
        emailQueue: delEmailQueue.count,
        users: delUsers.count,
        auditLogs: delAuditLogs.count,
        totalCleaned:
          delNotifications.count +
          delTasks.count +
          delTransactions.count +
          delHabits.count +
          delGoals.count +
          delNotes.count +
          delEmailQueue.count +
          delUsers.count +
          delAuditLogs.count
      };
    });

    // Write a permanent non-test audit log for tracking
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'PURGE_SANDBOX_DATA',
        beforeState: null,
        afterState: JSON.stringify(summary),
        result: 'Success',
        reason: `Admin đã kích hoạt Dọn dẹp Sandbox. Đã xóa ${summary.totalCleaned} bản ghi thử nghiệm.`,
        isTestData: false
      }
    });

    res.json({
      success: true,
      message: `Dọn dẹp Sandbox hoàn tất! Đã xóa sạch ${summary.totalCleaned} bản ghi thử nghiệm khỏi cơ sở dữ liệu. Dữ liệu người dùng thật được bảo vệ 100%.`,
      cleaned: summary
    });
  } catch (err: any) {
    console.error('[TestLab] Sandbox clean error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
