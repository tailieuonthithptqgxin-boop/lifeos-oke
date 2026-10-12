import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin, requireFeature, requireActiveSubscription, AuthRequest } from '../auth.middleware.js';
import { dbService, getPrisma } from '../db.js';
import { DecisionEngineService } from '../services/decisionEngine.service.js';
import { AutomationEngineService } from '../services/automationEngine.service.js';
import { subscriptionService, OFFICIAL_PLANS } from '../services/subscription.service.js';
import { teamService } from '../services/team.service.js';
import { gmailService } from '../services/gmailNotification.service.js';
import { referralService } from '../services/referral.service.js';
import { feedbackService } from '../services/feedback.service.js';
import { lifeHarmonyService } from '../services/lifeHarmony.service.js';
import { journeyService } from '../services/journey.service.js';
import { progressionService } from '../services/progression.service.js';
import { rpgService } from '../services/rpg.service.js';
import { r2Router } from './r2.routes.js';
import { customModulesRouter } from './customModules.routes.js';
import { vocabRouter } from './vocab.routes.js';
import { paymentRateLimiter, couponRateLimiter } from '../security/rateLimiter.js';
import {
  FinanceTransactionSchema,
  CouponValidateSchema,
  CartCheckoutSchema,
  SaaSCheckoutSessionSchema,
  VerifyPaymentSchema,
  SubmitPaymentRequestSchema,
  AdminRejectPaymentSchema,
  AdminUpdateBankConfigSchema,
  AdminUpdatePlanSchema,
  AdminUpdateLanguagesSchema,
  UpgradePlanSchema,
  AdminCreateUserSchema,
  AdminUpdateStatusSchema,
  AdminChangePlanSchema,
  AdminResetPasswordSchema,
  validateBody
} from '../validation.js';

export const apiRouter = Router();

// Cloudflare R2 Storage Sub-router
apiRouter.use('/r2', r2Router);

// Dynamic Custom Modules & Extensions (Admin extensible domains)
apiRouter.use('/custom-modules', customModulesRouter);

// Vocabulary & Spaced Repetition Mastery Sub-router
apiRouter.use('/vocab', vocabRouter);

// Publicly readable endpoints (languages configuration and pricing plans)
apiRouter.get('/languages', async (req: any, res: Response) => {
  try {
    const allLanguages = await getSystemLanguagesConfig();
    const activeLanguages = allLanguages.filter(l => l.status === 'ACTIVE');
    const defaultLang = allLanguages.find(l => l.isDefault)?.code || 'vi';

    res.json({
      success: true,
      languages: activeLanguages,
      allLanguages,
      defaultLanguage: defaultLang
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.get('/payments/plans', async (req: any, res: Response) => {
  try {
    const plans = await subscriptionService.getPlans(false);
    res.json({
      success: true,
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        badge: p.badge || (p.type === 'TEAM' ? 'Dành cho Đội ngũ' : (p.id === 'PERSONAL_3M' ? 'Phổ biến nhất' : 'Tiết kiệm')),
        description: p.description,
        durationDays: p.durationDays,
        price: p.price,
        monthlyPrice: p.price,
        yearlyPrice: p.yearlyPrice || 0,
        billingCycle: p.billingCycle,
        maxTeamMembers: p.maxTeamMembers || (p.type === 'TEAM' ? 5 : 0),
        pricing: {
          monthly: {
            price: p.price,
            displayPrice: `${p.price.toLocaleString('vi-VN')} ₫`,
            period: p.billingCycle
          },
          yearly: {
            price: p.yearlyPrice || p.price,
            displayPrice: `${(p.yearlyPrice || p.price).toLocaleString('vi-VN')} ₫`,
            period: p.yearlyPrice ? '1 năm' : p.billingCycle
          }
        },
        benefits: p.features,
        quota: p.quota || (p.type === 'TEAM' ? 'Tối đa 5 thành viên' : 'Sử dụng cá nhân toàn diện')
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Protect all /api endpoints with authentication
apiRouter.use(requireAuth);

// Universal Subscription & Access Control Gate:
// Non-admin users MUST have an ACTIVE, non-expired subscription (or active Team membership) to access paid workspace modules or mutate data.
apiRouter.use(async (req: AuthRequest, res: Response, next: any) => {
  const path = req.path;
  const method = req.method.toUpperCase();

  // 1. Always allowed for all authenticated users (Billing, Checkout, Support, Notifications, Profile, Language, Team status & join)
  const isAlwaysAllowed =
    path.startsWith('/payments') ||
    path.startsWith('/coupons') ||
    path.startsWith('/cart') ||
    path.startsWith('/data/cart') ||
    path.startsWith('/checkout') ||
    path.startsWith('/admin') ||
    path.startsWith('/notifications') ||
    path.startsWith('/supportTickets') ||
    path.startsWith('/settings') ||
    path.startsWith('/languages') ||
    path.startsWith('/life-harmony') ||
    path.startsWith('/journey') ||
    path.startsWith('/progression') ||
    path.startsWith('/team/my-team') ||
    path.startsWith('/team/join') ||
    (path.startsWith('/r2/upload-base64') && req.body?.folder === 'receipts');

  if (isAlwaysAllowed) {
    return next();
  }

  // 2. Public / Free collections allowed for read-only (GET) by all users
  if (method === 'GET') {
    if (
      path === '/data/products' ||
      path === '/data/notifications' ||
      path === '/data/supportTickets' ||
      path === '/data/cart' ||
      path === '/data/cartItems' ||
      path === '/data/orders'
    ) {
      return next();
    }
  }

  // 3. For all other workspace data (tasks, projects, calendarEvents, focus, finance, study, habits, goals, notes, decisions, automation, custom-modules, R2 backups):
  // Strictly enforce active subscription on server-side
  return requireActiveSubscription(req, res, next);
});

const ALLOWED_COLLECTIONS = new Set([
  'tasks',
  'projects',
  'events',
  'calendarEvents',
  'scheduleBlocks',
  'routines',
  'reminders',
  'focusSessions',
  'focusGoals',
  'financeAccounts',
  'transactions',
  'budgets',
  'savingGoals',
  'debts',
  'recurringTransactions',
  'subjects',
  'studyTopics',
  'studyAssignments',
  'studyExams',
  'studySessions',
  'habits',
  'habitRecords',
  'goals',
  'notes',
  'decisions',
  'decisionRules',
  'automationRules',
  'automationHistory',
  'automationConflicts',
  'products',
  'cart',
  'cartItems',
  'orders',
  'coupons',
  'inbox',
  'supportTickets',
  'notifications'
]);

// --------------------------------------------------------------------------
// GENERIC USER-OWNED COLLECTION CRUD (Strict Ownership Enforcement)
// --------------------------------------------------------------------------
apiRouter.get('/data/:collection', async (req: AuthRequest, res: Response) => {
  const { collection } = req.params;
  const userId = req.userId!;

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_COLLECTION', message: `Danh mục '${collection}' không hợp lệ.` },
      message: `Danh mục '${collection}' không hợp lệ.`
    });
    return;
  }

  try {
    // Special collections that have custom retrieval logic
    if (collection === 'products') {
      const templates = await dbService.getSystemTemplates();
      res.json(templates);
      return;
    }

    const items = await dbService.getUserCollection(collection, userId);
    res.json(items);
  } catch (err: any) {
    console.error(`GET /api/data/${collection} error:`, err);
    res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message },
      message: err.message
    });
  }
});

// Endpoint to apply a system template into user workspace
apiRouter.post('/templates/:id/apply', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const template = await prisma.systemTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu này trong hệ thống.' });
    }

    // Check permissions if template has price > 0
    const userRole = (req.userRole || '').toUpperCase();
    const userPlan = (req.userPlan || 'FREE').toUpperCase();
    const hasPaidPlan = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userPlan !== 'FREE';

    if (!template.isFree && template.price > 0 && !hasPaidPlan) {
      const hasPurchased = await prisma.order.findFirst({
        where: {
          userId,
          status: 'COMPLETED',
          items: { contains: template.id }
        }
      });
      if (!hasPurchased) {
        return res.status(403).json({
          success: false,
          requiresPurchase: true,
          message: 'Mẫu này yêu cầu kích hoạt gói dịch vụ để áp dụng.'
        });
      }
    }

    const createdSummary: { projects?: number; tasks?: number; habits?: number; accounts?: number; notes?: number; view: string } = { view: 'tasks' };

    if (id === 'tpl_para_system' || template.category === 'Productivity') {
      const existingProject = await prisma.project.findFirst({
        where: { userId, name: '[P] Dự án đang triển khai (Projects)' }
      });

      if (!existingProject) {
        const p1 = await prisma.project.create({
          data: { userId, name: '[P] Dự án đang triển khai (Projects)', description: 'Tổ chức các mục tiêu và dự án hành động theo P.A.R.A', status: 'Đang làm', color: '#2563eb' }
        });
        const p2 = await prisma.project.create({
          data: { userId, name: '[A] Khu vực trách nhiệm cốt lõi (Areas)', description: 'Các tiêu chuẩn trách nhiệm duy trì liên tục', status: 'Đang làm', color: '#10b981' }
        });
        const p3 = await prisma.project.create({
          data: { userId, name: '[R] Tài nguyên & Kiến thức (Resources)', description: 'Tài liệu tham khảo, bài học và nghiên cứu', status: 'Mới tạo', color: '#f59e0b' }
        });
        const p4 = await prisma.project.create({
          data: { userId, name: '[A] Kho lưu trữ hoàn thành (Archives)', description: 'Dự án đã xong và tài liệu lưu trữ', status: 'Mới tạo', color: '#64748b' }
        });

        const todayStr = new Date().toISOString().split('T')[0];
        await prisma.task.createMany({
          data: [
            { userId, projectId: p1.id, title: 'Liệt kê các mục tiêu ngắn hạn vào thư mục Projects', priority: 'Cao', status: 'Chưa làm', dueDate: todayStr },
            { userId, projectId: p2.id, title: 'Thiết lập các tiêu chuẩn duy trì cho Khu vực trách nhiệm (Areas)', priority: 'Trung bình', status: 'Chưa làm', dueDate: todayStr },
            { userId, projectId: p3.id, title: 'Lưu trữ tài liệu và liên kết tham khảo vào Resources', priority: 'Thấp', status: 'Đang làm', dueDate: todayStr },
            { userId, projectId: p4.id, title: 'Dọn dẹp và lưu trữ các dự án đã kết thúc vào Archives', priority: 'Thấp', status: 'Đang chờ' }
          ]
        });

        await prisma.note.create({
          data: {
            userId,
            title: 'Sổ tay Hướng dẫn Phương pháp P.A.R.A (Tiago Forte)',
            content: '### Phương pháp P.A.R.A:\n- **P - Projects**: Các dự án có kết quả và thời hạn cụ thể.\n- **A - Areas**: Các khu vực trách nhiệm liên tục (Sức khỏe, Tài chính, Công việc).\n- **R - Resources**: Tài liệu tham khảo, ghi chú và chủ đề quan tâm.\n- **A - Archives**: Kho lưu trữ các dự án đã xong.',
            category: 'Productivity',
            tags: '["PARA", "Productivity", "Organization"]'
          }
        });
      }

      createdSummary.projects = 4;
      createdSummary.tasks = 4;
      createdSummary.notes = 1;
      createdSummary.view = 'projects';
    } else if (id === 'tpl_finance_freedom' || template.category === 'Finance') {
      const existingAccounts = await prisma.financeAccount.findMany({
        where: { userId }
      });
      const existingNames = new Set(existingAccounts.map(a => a.name));

      if (!existingNames.has('Tài khoản Thiết yếu 50% (Needs)')) {
        await prisma.financeAccount.create({
          data: { userId, name: 'Tài khoản Thiết yếu 50% (Needs)', type: 'Ngân hàng', balance: 0, currency: 'VND', color: '#2563eb' }
        });
      }
      if (!existingNames.has('Tài khoản Tiết kiệm & Đầu tư 20% (Savings)')) {
        await prisma.financeAccount.create({
          data: { userId, name: 'Tài khoản Tiết kiệm & Đầu tư 20% (Savings)', type: 'Đầu tư', balance: 0, currency: 'VND', color: '#10b981' }
        });
      }
      if (!existingNames.has('Tài khoản Chi tiêu Cá nhân 30% (Wants)')) {
        await prisma.financeAccount.create({
          data: { userId, name: 'Tài khoản Chi tiêu Cá nhân 30% (Wants)', type: 'Tiền mặt', balance: 0, currency: 'VND', color: '#f59e0b' }
        });
      }

      const existingBudgets = await prisma.budget.findMany({ where: { userId } });
      const existingCategories = new Set(existingBudgets.map(b => b.category));
      const newBudgets = [
        { category: 'Nhu cầu thiết yếu (50%)', limit: 10000000, period: 'Hàng tháng', spent: 0 },
        { category: 'Tiết kiệm & Đầu tư (20%)', limit: 4000000, period: 'Hàng tháng', spent: 0 },
        { category: 'Chi tiêu cá nhân (30%)', limit: 6000000, period: 'Hàng tháng', spent: 0 }
      ].filter(b => !existingCategories.has(b.category));

      if (newBudgets.length > 0) {
        await prisma.budget.createMany({
          data: newBudgets.map(b => ({ ...b, userId }))
        });
      }

      const existingGoal = await prisma.savingGoal.findFirst({
        where: { userId, title: 'Quỹ khẩn cấp 6 tháng chi tiêu' }
      });
      if (!existingGoal) {
        await prisma.savingGoal.create({
          data: {
            userId,
            title: 'Quỹ khẩn cấp 6 tháng chi tiêu',
            targetAmount: 50000000,
            currentAmount: 0
          }
        });
      }

      createdSummary.accounts = 3;
      createdSummary.view = 'finance';
    } else if (id === 'tpl_atomic_habits' || template.category === 'Habits' || template.category === 'Health') {
      const existingHabit = await prisma.habit.findFirst({
        where: { userId, name: 'Đọc sách phát triển tư duy' }
      });

      if (!existingHabit) {
        await prisma.habit.createMany({
          data: [
            { userId, name: 'Đọc sách phát triển tư duy', category: 'Study', target: 20, unitLabel: 'trang', unit: 'pages', status: 'Active' },
            { userId, name: 'Vận động thể chất / Cardio', category: 'Health', target: 30, unitLabel: 'phút', unit: 'minutes', status: 'Active' },
            { userId, name: 'Thiền định & Phản chiếu cuối ngày', category: 'Personal', target: 10, unitLabel: 'phút', unit: 'minutes', status: 'Active' },
            { userId, name: 'Uống đủ 2 lít nước', category: 'Health', target: 2000, unitLabel: 'ml', unit: 'ml', status: 'Active' }
          ]
        });

        const todayStr = new Date().toISOString().split('T')[0];
        await prisma.scheduleBlock.createMany({
          data: [
            { userId, date: todayStr, label: 'Khởi động ngày mới năng suất (Morning Routine)', startTime: '06:30', endTime: '07:30', category: 'Health' },
            { userId, date: todayStr, label: 'Đánh giá & Dọn dẹp tâm trí (Evening Reflection)', startTime: '22:00', endTime: '22:30', category: 'Mindfulness' }
          ]
        });
      }

      createdSummary.habits = 4;
      createdSummary.view = 'habits';
    } else {
      // General template
      const proj = await prisma.project.create({
        data: { userId, name: template.title, description: template.description || 'Dự án tạo từ mẫu thư viện', status: 'Đang làm', color: '#2563eb' }
      });
      const todayStr = new Date().toISOString().split('T')[0];
      await prisma.task.create({
        data: { userId, projectId: proj.id, title: `Khởi tạo kế hoạch: ${template.title}`, priority: 'Cao', status: 'Chưa làm', dueDate: todayStr }
      });
      createdSummary.projects = 1;
      createdSummary.tasks = 1;
      createdSummary.view = 'projects';
    }

    // Record usage
    await prisma.templateUsage.create({
      data: { userId, templateId: template.id }
    }).catch(() => {});

    await prisma.systemTemplate.update({
      where: { id: template.id },
      data: { usesCount: { increment: 1 } }
    }).catch(() => {});

    res.json({
      success: true,
      message: `Đã áp dụng mẫu "${template.title}" thành công vào không gian làm việc của bạn!`,
      summary: createdSummary
    });
  } catch (err: any) {
    console.error('Error applying template:', err);
    res.status(500).json({ success: false, message: err.message || 'Không thể áp dụng mẫu này.' });
  }
});

// --------------------------------------------------------------------------
// HÀNH TRÌNH CỦA TÔI (MY JOURNEY & ACHIEVEMENTS)
// --------------------------------------------------------------------------
apiRouter.get('/journey', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const data = await journeyService.getJourneyData(userId);
    res.json({
      success: true,
      ...data
    });
  } catch (err: any) {
    console.error('Error fetching journey data:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải dữ liệu hành trình cá nhân.' });
  }
});

apiRouter.post('/journey/milestone', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { title, description, category, date, icon, metricValue, metricLabel, isHighlighted } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ success: false, message: 'Tiêu đề cột mốc là bắt buộc.' });
    return;
  }

  const milestoneDate = date && String(date).trim() ? String(date).trim() : new Date().toISOString().split('T')[0];

  try {
    const created = await journeyService.createManualMilestone(userId, {
      title,
      description,
      category,
      date: milestoneDate,
      icon,
      metricValue,
      metricLabel,
      isHighlighted
    });

    res.json({
      success: true,
      message: 'Đã thêm cột mốc thành tựu mới vào hành trình!',
      milestone: created
    });
  } catch (err: any) {
    console.error('Error creating journey milestone:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi tạo cột mốc thành tựu.' });
  }
});

apiRouter.delete('/journey/milestone/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const milestoneId = req.params.id;

  try {
    await journeyService.deleteManualMilestone(userId, milestoneId);
    res.json({
      success: true,
      message: 'Đã xóa cột mốc thành tựu.'
    });
  } catch (err: any) {
    console.error('Error deleting journey milestone:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi xóa cột mốc.' });
  }
});

// --------------------------------------------------------------------------
// GAME-LIKE LIFE PROGRESSION SYSTEM (GEN Z) ENDPOINTS
// --------------------------------------------------------------------------
apiRouter.get('/progression', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const data = await progressionService.getProgressionState(userId);
    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('Error fetching progression state:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải hệ thống tiến độ cá nhân.' });
  }
});

apiRouter.post('/progression/quest/claim', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { questKey } = req.body;
  if (!questKey) {
    res.status(400).json({ success: false, message: 'Thiếu questKey.' });
    return;
  }
  try {
    const result = await progressionService.claimDailyQuest(userId, questKey);
    res.json({
      success: true,
      message: 'Nhận thưởng nhiệm vụ thành công!',
      data: result
    });
  } catch (err: any) {
    console.error('Error claiming quest:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể nhận thưởng nhiệm vụ.' });
  }
});

apiRouter.post('/progression/challenge/claim', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { challengeKey } = req.body;
  if (!challengeKey) {
    res.status(400).json({ success: false, message: 'Thiếu challengeKey.' });
    return;
  }
  try {
    const result = await progressionService.claimWeeklyChallenge(userId, challengeKey);
    res.json({
      success: true,
      message: 'Nhận thưởng thử thách tuần thành công!',
      data: result
    });
  } catch (err: any) {
    console.error('Error claiming challenge:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể nhận thưởng thử thách.' });
  }
});

apiRouter.post('/progression/reward/unlock', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { cosmeticKey } = req.body;
  if (!cosmeticKey) {
    res.status(400).json({ success: false, message: 'Thiếu cosmeticKey.' });
    return;
  }
  try {
    const result = await progressionService.unlockCosmetic(userId, cosmeticKey);
    res.json({
      success: true,
      message: `Đã mở khóa ngoại trang "${result.item.name}"!`,
      data: result
    });
  } catch (err: any) {
    console.error('Error unlocking cosmetic:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể mở khóa ngoại trang.' });
  }
});

apiRouter.post('/progression/reward/equip', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { rewardType, rewardKey } = req.body;
  if (!rewardType || !rewardKey) {
    res.status(400).json({ success: false, message: 'Thiếu rewardType hoặc rewardKey.' });
    return;
  }
  try {
    const result = await progressionService.equipCosmetic(userId, rewardType, rewardKey);
    res.json({
      success: true,
      message: 'Đã trang bị ngoại trang thành công!',
      data: result
    });
  } catch (err: any) {
    console.error('Error equipping cosmetic:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể trang bị ngoại trang.' });
  }
});

// Daily Mystery Chest opening endpoint
apiRouter.post('/progression/chest/open', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const result = await progressionService.openDailyChest(userId);
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error('Error opening daily chest:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể mở rương kho báu.' });
  }
});

// ============================================================================
// RPG SYSTEM ROUTES (MONSTER BATTLE × REAL-LIFE ACTION PROGRESSION)
// ============================================================================

// 1. Character RPG Profile & Real Stat Breakdown
apiRouter.get('/rpg/character', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await rpgService.ensureStarterKit(userId);
    const stats = await rpgService.calculateRealCharacterStats(userId);
    res.json({
      success: true,
      data: stats
    });
  } catch (err: any) {
    console.error('Error fetching RPG character stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Không thể tải chỉ số RPG nhân vật.' });
  }
});

// 2. Monsters Catalog & Chapters Roadmap with Real Unlock Status
apiRouter.get('/rpg/monsters', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const data = await rpgService.getMonstersAndProgress(userId);
    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('Error fetching monsters progress:', err);
    res.status(500).json({ success: false, message: err.message || 'Không thể tải danh sách quái vật.' });
  }
});

// 3. Enter Battle & Turn-based Combat Simulation (Backend Source of Truth)
apiRouter.post('/rpg/battle', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { monsterId } = req.body;
  if (!monsterId) {
    res.status(400).json({ success: false, message: 'Thiếu monsterId để khiêu chiến.' });
    return;
  }
  try {
    const result = await rpgService.simulateBattle(userId, monsterId);
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error('Error in RPG battle:', err);
    res.status(400).json({ success: false, message: err.message || 'Trận chiến không thể diễn ra.' });
  }
});

// 4. Equipment Inventory & Stats
apiRouter.get('/rpg/equipment', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await rpgService.ensureStarterKit(userId);
    const data = await rpgService.getUserEquipments(userId);
    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('Error fetching RPG equipment:', err);
    res.status(500).json({ success: false, message: err.message || 'Không thể tải kho trang bị.' });
  }
});

// 5. Equip Item
apiRouter.post('/rpg/equipment/equip', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { equipmentId } = req.body;
  if (!equipmentId) {
    res.status(400).json({ success: false, message: 'Thiếu equipmentId.' });
    return;
  }
  try {
    const item = await rpgService.equipItem(userId, equipmentId);
    res.json({
      success: true,
      message: 'Đã trang bị vật phẩm thành công!',
      data: item
    });
  } catch (err: any) {
    console.error('Error equipping item:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể trang bị vật phẩm.' });
  }
});

// 6. Upgrade Equipment using Coins
apiRouter.post('/rpg/equipment/upgrade', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { equipmentId } = req.body;
  if (!equipmentId) {
    res.status(400).json({ success: false, message: 'Thiếu equipmentId.' });
    return;
  }
  try {
    const result = await rpgService.upgradeEquipment(userId, equipmentId);
    res.json({
      success: true,
      message: 'Nâng cấp trang bị thành công!',
      data: result
    });
  } catch (err: any) {
    console.error('Error upgrading equipment:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể nâng cấp trang bị.' });
  }
});

// 7. Skill Trees
apiRouter.get('/rpg/skills', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const data = await rpgService.getSkillTrees(userId);
    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('Error fetching skill trees:', err);
    res.status(500).json({ success: false, message: err.message || 'Không thể tải cây kỹ năng.' });
  }
});

// 8. Unlock Skill
apiRouter.post('/rpg/skills/unlock', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { skillKey } = req.body;
  if (!skillKey) {
    res.status(400).json({ success: false, message: 'Thiếu skillKey.' });
    return;
  }
  try {
    const result = await rpgService.unlockSkill(userId, skillKey);
    res.json({
      success: true,
      message: 'Đã mở khóa kỹ năng thành công!',
      data: result
    });
  } catch (err: any) {
    console.error('Error unlocking skill:', err);
    res.status(400).json({ success: false, message: err.message || 'Không thể mở khóa kỹ năng.' });
  }
});

// 9. Battle History
apiRouter.get('/rpg/battles/history', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();
  try {
    const records = await prisma.battleRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({
      success: true,
      data: records.map(r => ({
        ...r,
        turnsLog: typeof r.turnsLog === 'string' ? JSON.parse(r.turnsLog) : r.turnsLog,
        rewardEquipment: r.rewardEquipment && typeof r.rewardEquipment === 'string' ? JSON.parse(r.rewardEquipment) : r.rewardEquipment
      }))
    });
  } catch (err: any) {
    console.error('Error fetching battle history:', err);
    res.status(500).json({ success: false, message: err.message || 'Không thể tải lịch sử chiến đấu.' });
  }
});

// Dedicated Habit Toggle with Real Streak & XP integration
apiRouter.post('/habits/:id/toggle', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const habitId = req.params.id;
  const prisma = getPrisma();

  try {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId }
    });

    if (!habit) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thói quen.' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let dates: string[] = [];
    try {
      dates = typeof habit.completedDates === 'string' ? JSON.parse(habit.completedDates || '[]') : (habit.completedDates || []);
    } catch {
      dates = [];
    }

    const wasCompleted = dates.includes(todayStr);
    let newDates: string[];
    let newStreak = habit.streak || 0;
    let newBest = habit.bestStreak || 0;

    if (wasCompleted) {
      // Bỏ chọn hôm nay
      newDates = dates.filter(d => d !== todayStr);
      newStreak = Math.max(0, newStreak - 1);
    } else {
      // Đánh dấu hoàn thành hôm nay
      newDates = [...dates, todayStr];
      newStreak += 1;
      if (newStreak > newBest) newBest = newStreak;
    }

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: {
        completedDates: JSON.stringify(newDates),
        streak: newStreak,
        bestStreak: newBest
      }
    });

    // Nếu vừa đánh dấu hoàn thành, thưởng XP & Coins
    let xpResult = null;
    if (!wasCompleted) {
      xpResult = await progressionService.awardXp(userId, {
        amount: 15,
        category: 'habit',
        source: 'habit_complete',
        sourceId: `${habitId}_${todayStr}`,
        description: `Kỷ luật thói quen: ${habit.name}`
      }).catch(() => null);
    }

    res.json({
      success: true,
      completed: !wasCompleted,
      habit: {
        ...updated,
        completedDates: newDates
      },
      xpResult
    });
  } catch (err: any) {
    console.error('Error toggling habit:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi cập nhật thói quen.' });
  }
});

apiRouter.post('/data/:collection', async (req: AuthRequest, res: Response) => {
  const { collection } = req.params;
  const userId = req.userId!;

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_COLLECTION', message: `Danh mục '${collection}' không hợp lệ.` },
      message: `Danh mục '${collection}' không hợp lệ.`
    });
    return;
  }

  try {
    const payload = { ...req.body };

    // Prevent client from forging sensitive business fields
    delete payload.userId;
    delete payload.role;
    delete payload.plan;
    if (collection === 'financeAccounts') {
      // Balance can only be manipulated via /api/finance/transaction
      payload.balance = parseFloat(payload.balance) || 0;
    }

    const created = await dbService.addItemToUserCollection(collection, userId, payload);

    // Real Gamification Progression Hooks:
    if (collection === 'tasks' && created.status === 'Hoàn thành') {
      progressionService.awardXp(userId, {
        amount: 20,
        category: 'task',
        source: 'task_complete',
        sourceId: created.id,
        description: `Hoàn thành việc: ${created.title || 'Nhiệm vụ'}`
      }).catch(err => console.warn('Progression hook error:', err));
    } else if (collection === 'focusSessions' && (created.status === 'Completed' || created.status === 'Hoàn thành')) {
      const minutes = created.actualDuration || 25;
      const xp = Math.max(10, Math.floor(minutes / 25 * 15));
      progressionService.awardXp(userId, {
        amount: xp,
        category: 'focus',
        source: 'focus_session',
        sourceId: created.id,
        description: `Tập trung sâu: ${minutes} phút`
      }).catch(err => console.warn('Progression hook error:', err));
    }

    // Audit log for state changes
    if (['decisions', 'budgets', 'orders', 'projects'].includes(collection)) {
      await dbService.createAuditLog(
        userId,
        `CREATE_${collection.toUpperCase()}`,
        collection,
        created.id,
        null,
        created
      );
    }

    res.status(201).json(created);
  } catch (err: any) {
    console.error(`POST /api/data/${collection} error:`, err);
    res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message },
      message: err.message
    });
  }
});

apiRouter.put('/data/:collection/:id', async (req: AuthRequest, res: Response) => {
  const { collection, id } = req.params;
  const userId = req.userId!;

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_COLLECTION', message: `Danh mục '${collection}' không hợp lệ.` },
      message: `Danh mục '${collection}' không hợp lệ.`
    });
    return;
  }

  try {
    const updates = { ...req.body };

    // Strip forbidden fields from generic update
    delete updates.userId;
    delete updates.role;
    delete updates.plan;
    if (collection === 'users') {
      delete updates.status; // For system user status only
    }
    if (collection === 'financeAccounts') {
      if (updates.balance !== undefined) {
        updates.balance = parseFloat(updates.balance) || 0;
      }
    }

    const updated = await dbService.updateUserCollectionItem(collection, userId, id, updates, req.userRole);

    // Real Gamification Progression Hooks:
    if (collection === 'tasks' && (updated.status === 'Hoàn thành' || updated.status === 'Done' || updated.status === 'completed')) {
      progressionService.awardXp(userId, {
        amount: 20,
        category: 'task',
        source: 'task_complete',
        sourceId: id,
        description: `Hoàn thành việc: ${updated.title || 'Nhiệm vụ'}`
      }).catch(err => console.warn('Progression hook error:', err));
    } else if (collection === 'focusSessions' && (updated.status === 'Completed' || updated.status === 'Hoàn thành')) {
      const minutes = updated.actualDuration || 25;
      const xp = Math.max(10, Math.floor(minutes / 25 * 15));
      progressionService.awardXp(userId, {
        amount: xp,
        category: 'focus',
        source: 'focus_session',
        sourceId: id,
        description: `Tập trung sâu: ${minutes} phút`
      }).catch(err => console.warn('Progression hook error:', err));
    } else if (collection === 'savingGoals') {
      if (updated.currentAmount >= updated.targetAmount && updated.targetAmount > 0) {
        progressionService.awardXp(userId, {
          amount: 60,
          category: 'finance',
          source: 'saving_target_reached',
          sourceId: `${id}_reached`,
          description: `Chinh phục mục tiêu tiết kiệm: ${updated.title || 'Khoản tích lũy'}`
        }).catch(err => console.warn('Progression hook error:', err));
      }
    }

    res.json(updated);
  } catch (err: any) {
    const isClientError = err.message && (
      err.message.includes('not found') || 
      err.message.includes('permission') || 
      err.code === 'P2025'
    );
    if (isClientError) {
      console.warn(`PUT /api/data/${collection}/${id} client warning: ${err.message}`);
      res.status(404).json({
        success: false,
        error: { code: 'RECORD_NOT_FOUND', message: err.message },
        message: err.message
      });
      return;
    }
    console.error(`PUT /api/data/${collection}/${id} error:`, err);
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: err.message },
      message: err.message
    });
  }
});

apiRouter.delete('/data/:collection/:id', async (req: AuthRequest, res: Response) => {
  const { collection, id } = req.params;
  const userId = req.userId!;

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_COLLECTION', message: `Danh mục '${collection}' không hợp lệ.` },
      message: `Danh mục '${collection}' không hợp lệ.`
    });
    return;
  }

  try {
    await dbService.deleteUserCollectionItem(collection, userId, id, req.userRole);
    res.json({ success: true, message: 'Đã xóa thành công' });
  } catch (err: any) {
    const isClientError = err.message && (
      err.message.includes('not found') || 
      err.message.includes('permission') || 
      err.code === 'P2025'
    );
    if (isClientError) {
      console.warn(`DELETE /api/data/${collection}/${id} client warning: ${err.message}`);
      res.status(404).json({
        success: false,
        error: { code: 'RECORD_NOT_FOUND', message: err.message },
        message: err.message
      });
      return;
    }
    console.error(`DELETE /api/data/${collection}/${id} error:`, err);
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// NOTIFICATIONS MANAGEMENT
// --------------------------------------------------------------------------
apiRouter.delete('/notifications/all', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const prisma = getPrisma();
    await prisma.notification.deleteMany({
      where: { userId }
    });
    res.json({ success: true, message: 'Đã xóa tất cả thông báo' });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: err.message },
      message: err.message
    });
  }
});

apiRouter.put('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  try {
    const prisma = getPrisma();
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true }
    });
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// COMMERCE: COUPON VALIDATION & CHECKOUT
// --------------------------------------------------------------------------
apiRouter.post('/coupons/validate', couponRateLimiter, validateBody(CouponValidateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const cleanCode = code.toUpperCase().trim();
    const prisma = getPrisma();

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });

    if (!coupon) {
      res.status(404).json({
        success: false,
        error: { code: 'COUPON_NOT_FOUND', message: 'Mã giảm giá không tồn tại.' },
        message: 'Mã giảm giá không tồn tại.'
      });
      return;
    }

    if (coupon.status !== 'Active') {
      res.status(400).json({
        success: false,
        error: { code: 'COUPON_INACTIVE', message: 'Mã giảm giá này hiện không còn áp dụng.' },
        message: 'Mã giảm giá này hiện không còn áp dụng.'
      });
      return;
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        error: { code: 'COUPON_EXPIRED', message: 'Mã giảm giá này đã hết hạn sử dụng.' },
        message: 'Mã giảm giá này đã hết hạn sử dụng.'
      });
      return;
    }

    if (coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({
        success: false,
        error: { code: 'COUPON_LIMIT_REACHED', message: 'Mã giảm giá đã hết lượt sử dụng.' },
        message: 'Mã giảm giá đã hết lượt sử dụng.'
      });
      return;
    }

    res.json({
      success: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      message: `Mã hợp lệ! Giảm ${coupon.discountPercent}% cho đơn hàng.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
      message: err.message
    });
  }
});

apiRouter.post('/cart/checkout', paymentRateLimiter, validateBody(CartCheckoutSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { couponCode } = req.body;
  const prisma = getPrisma();

  try {
    // 1. Retrieve user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId }
    });

    if (!cartItems.length) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CART', message: 'Giỏ hàng của bạn đang trống.' },
        message: 'Giỏ hàng của bạn đang trống.'
      });
      return;
    }

    // 2. Fetch product details
    const productIds = cartItems.map(c => c.productId);
    const templates = await prisma.systemTemplate.findMany({
      where: { id: { in: productIds } }
    });
    const templateMap = new Map(templates.map(t => [t.id, t]));

    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of cartItems) {
      const product = templateMap.get(item.productId);
      const price = product?.price || 0;
      subtotal += price * item.quantity;
      orderItems.push({
        productId: item.productId,
        productName: product?.title || 'System Template',
        price,
        quantity: item.quantity
      });
    }

    // 3. Validate coupon if provided
    let discountPercent = 0;
    let validCoupon: any = null;
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.toUpperCase().trim();
      validCoupon = await prisma.coupon.findUnique({ where: { code: cleanCode } });
      if (validCoupon && validCoupon.status === 'Active') {
        if (!validCoupon.expiresAt || new Date(validCoupon.expiresAt).getTime() >= Date.now()) {
          if (validCoupon.usedCount < validCoupon.maxUses) {
            discountPercent = validCoupon.discountPercent;
          }
        }
      }
    }

    const discount = (subtotal * discountPercent) / 100;
    const total = Math.max(0, subtotal - discount);
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 4. Execute atomic checkout transaction
    const txResults: any = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId,
          orderId,
          items: JSON.stringify(orderItems),
          subtotal,
          discount,
          total,
          status: 'Paid',
          couponCode: discountPercent > 0 ? couponCode : null
        }
      }),
      prisma.payment.create({
        data: {
          userId,
          customerEmail: req.user.email,
          orderId,
          planRequested: 'PRO',
          amount: total,
          method: 'Bank Transfer',
          status: 'Paid',
          txReference: `TX_${Date.now()}`
        }
      }),
      // Clear cart
      prisma.cartItem.deleteMany({
        where: { userId }
      }),
      // Increment coupon usage count atomically if used (only if strictly under maxUses)
      ...(validCoupon ? [
        prisma.coupon.updateMany({
          where: { 
            id: validCoupon.id,
            usedCount: { lt: validCoupon.maxUses }
          },
          data: { usedCount: { increment: 1 } }
        })
      ] : [])
    ]);

    const createdOrder = txResults[0];
    const createdPayment = txResults[1];
    const couponResult = validCoupon ? txResults[3] : null;

    // If coupon was provided but update failed because maxUses was reached concurrently
    if (validCoupon && couponResult?.count === 0) {
      throw new Error('Mã giảm giá đã hết lượt sử dụng do có người dùng khác vừa áp dụng.');
    }

    // Record audit log
    await dbService.createAuditLog(
      userId,
      'CHECKOUT_ORDER_PAID',
      'orders',
      createdOrder.id,
      null,
      { orderId, total, itemsCount: orderItems.length }
    );

    res.json({
      success: true,
      message: 'Thanh toán đơn hàng thành công!',
      order: createdOrder,
      payment: createdPayment
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_FAILED', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// SAAS COMMERCE: PLANS, SECURE CHECKOUT & VERIFICATION (Zero physical shipping)
// --------------------------------------------------------------------------

const DEFAULT_BANK_CONFIG = {
  bankName: 'MBBank (Ngân hàng TMCP Quân Đội)',
  accountNumber: '888899998888',
  accountHolder: 'CONG TY CONG NGHE LIFEOS',
  transferPrefix: 'DUOTECH',
  bankCode: 'MB',
  qrImageUrl: '',
  isActive: true
};

async function getPaymentBankConfig() {
  try {
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'payment_bank_config' }
    });
    if (setting && setting.value) {
      return { ...DEFAULT_BANK_CONFIG, ...JSON.parse(setting.value) };
    }
  } catch (e: any) {
    if (e?.code === 'P2021') {
      import('../db.js').then(({ checkDbConnection }) => checkDbConnection().catch(() => {}));
    }
  }
  return DEFAULT_BANK_CONFIG;
}

export interface ServicePlanData {
  id: string;
  name: string;
  badge?: string;
  description: string;
  price: number;
  monthlyPrice: number;
  yearlyPrice: number;
  durationDays: number;
  type?: 'PERSONAL' | 'TEAM';
  maxTeamMembers?: number;
  billingCycle: string;
  status: 'ACTIVE' | 'INACTIVE';
  order: number;
  features: string[];
  quota?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SERVICE_PLANS: ServicePlanData[] = [
  {
    id: 'PERSONAL_1M',
    name: 'Gói Cá Nhân (1 Tháng)',
    type: 'PERSONAL',
    durationDays: 30,
    price: 15000,
    monthlyPrice: 15000,
    yearlyPrice: 0,
    billingCycle: '1 tháng (30 ngày)',
    badge: 'Tiết kiệm',
    description: 'Mở khóa toàn bộ chức năng LifeOS trong 1 tháng (30 ngày). Bắt buộc có gói trả phí để truy cập hệ thống.',
    status: 'ACTIVE',
    order: 1,
    features: [
      'Toàn bộ tính năng Quản lý Công việc & Dự án (Kanban, Lịch, Bộ lọc)',
      'Quản lý Tài chính, Ví tiền, Ngân sách và Báo cáo thu chi',
      'Theo dõi Thói quen, Chuỗi streak và Mục tiêu cuộc sống',
      'Decision Engine & Mô phỏng kịch bản What-if',
      'Automation Rules Engine kích hoạt tự động',
      'Không gian Học tập, Pomodoro Focus và Ghi chú không giới hạn',
      'Đồng bộ dữ liệu thời gian thực và tự động sao lưu an toàn'
    ],
    quota: '1 người dùng, không giới hạn tính năng'
  },
  {
    id: 'PERSONAL_3M',
    name: 'Gói Cá Nhân (3 Tháng)',
    type: 'PERSONAL',
    durationDays: 90,
    price: 40000,
    monthlyPrice: 40000,
    yearlyPrice: 0,
    billingCycle: '3 tháng (90 ngày)',
    badge: 'Phổ biến nhất',
    description: 'Mở khóa toàn bộ chức năng trong 3 tháng (90 ngày) liên tục với chi phí ưu đãi 40.000 VNĐ.',
    status: 'ACTIVE',
    order: 2,
    features: [
      'Bao gồm toàn bộ quyền lợi của Gói Cá Nhân 1 Tháng',
      'Thời hạn sử dụng 90 ngày liên tục',
      'Tiết kiệm 5.000 VNĐ so với gia hạn từng tháng',
      'Đồng bộ dữ liệu thời gian thực và sao lưu tự động',
      'Hỗ trợ kỹ thuật ưu tiên 24/7'
    ],
    quota: '1 người dùng, 90 ngày liên tục'
  },
  {
    id: 'TEAM_1M',
    name: 'Gói Đội Ngũ (Team 1 Tháng)',
    type: 'TEAM',
    durationDays: 30,
    price: 50000,
    monthlyPrice: 50000,
    yearlyPrice: 0,
    maxTeamMembers: 5,
    billingCycle: '1 tháng (30 ngày)',
    badge: 'Tối đa 5 thành viên',
    description: 'Dành cho đội ngũ làm việc cộng tác. Chủ team được mời thêm tối đa 5 người dùng cùng sử dụng đầy đủ mọi chức năng.',
    status: 'ACTIVE',
    order: 3,
    features: [
      'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
      'Cho phép Chủ Team thêm tối đa 5 người dùng vào Team',
      'Tất cả thành viên trong Team được hưởng toàn bộ tính năng trả phí',
      'Chủ Team có toàn quyền quản trị, thêm/xóa thành viên linh hoạt',
      'Tự động đồng bộ và kiểm soát quyền an toàn khi gói Team còn hạn'
    ],
    quota: 'Tối đa 5 thành viên / nhóm'
  },
  {
    id: 'PRO',
    name: 'Pro',
    type: 'PERSONAL',
    durationDays: 30,
    price: 199000,
    monthlyPrice: 199000,
    yearlyPrice: 1990000,
    billingCycle: '30 ngày',
    badge: 'Chuyên nghiệp',
    description: 'Gói chuyên nghiệp Pro cho cá nhân quản lý toàn diện.',
    status: 'ACTIVE',
    order: 4,
    features: [
      'Toàn bộ tính năng Quản lý Công việc & Dự án (Kanban, Lịch, Bộ lọc)',
      'Quản lý Tài chính, Ví tiền, Ngân sách và Báo cáo thu chi',
      'Theo dõi Thói quen, Chuỗi streak và Mục tiêu cuộc sống',
      'Decision Engine & Mô phỏng kịch bản What-if',
      'Automation Rules Engine kích hoạt tự động'
    ],
    quota: '1 người dùng, không giới hạn tính năng'
  },
  {
    id: 'TEAM',
    name: 'Team',
    type: 'TEAM',
    durationDays: 30,
    price: 499000,
    monthlyPrice: 499000,
    yearlyPrice: 4990000,
    maxTeamMembers: 5,
    billingCycle: '30 ngày',
    badge: 'Doanh nghiệp & Đội ngũ',
    description: 'Dành cho đội ngũ làm việc cộng tác.',
    status: 'ACTIVE',
    order: 5,
    features: [
      'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
      'Cho phép Chủ Team thêm tối đa 5 người dùng vào Team'
    ],
    quota: 'Tối đa 5 thành viên / nhóm'
  }
];

async function getServicePlansConfig(): Promise<ServicePlanData[]> {
  const plans = await subscriptionService.getPlans(true);
  return plans.map(p => ({
    id: p.id,
    name: p.name,
    badge: p.badge,
    description: p.description,
    price: p.price,
    monthlyPrice: p.price,
    yearlyPrice: p.yearlyPrice || 0,
    durationDays: p.durationDays || (p.id === 'PERSONAL_3M' ? 90 : 30),
    type: p.type,
    maxTeamMembers: p.maxTeamMembers,
    billingCycle: p.billingCycle,
    status: (p.status as any) || 'ACTIVE',
    order: p.order || 1,
    features: p.features || [],
    quota: p.quota,
    updatedAt: p.updatedAt,
    updatedBy: p.updatedBy
  }));
}

export interface SystemLanguageData {
  code: string;
  name: string;
  flag: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
}

const DEFAULT_LANGUAGES: SystemLanguageData[] = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', status: 'ACTIVE', isDefault: true },
  { code: 'en', name: 'English', flag: '🇬🇧', status: 'ACTIVE', isDefault: false }
];

async function getSystemLanguagesConfig(): Promise<SystemLanguageData[]> {
  try {
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'system_languages_config' }
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e: any) {
    if (e?.code === 'P2021') {
      import('../db.js').then(({ checkDbConnection }) => checkDbConnection().catch(() => {}));
    }
  }
  return DEFAULT_LANGUAGES;
}

// 1. Get bank transfer configuration
apiRouter.get('/payments/bank-config', async (req: AuthRequest, res: Response) => {
  try {
    const config = await getPaymentBankConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1b. Public List Active Plans (Single Source of Truth for frontend pricing & checkout)
apiRouter.get('/payments/plans', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await subscriptionService.getPlans(false);
    const formatted = plans.map(p => ({
      id: p.id,
      name: p.name,
      badge: p.badge,
      description: p.description,
      type: p.type,
      durationDays: p.durationDays,
      price: p.price,
      monthlyPrice: p.price,
      yearlyPrice: p.yearlyPrice || 0,
      billingCycle: p.billingCycle,
      benefits: p.features || [],
      quota: p.quota,
      maxTeamMembers: p.maxTeamMembers,
      pricing: {
        monthly: { price: p.price, durationDays: p.durationDays },
        yearly: { price: p.yearlyPrice || 0, durationDays: 365 }
      }
    }));

    res.json({
      success: true,
      plans: formatted
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Admin update bank transfer configuration
apiRouter.put('/admin/payments/bank-config', requireAdmin, validateBody(AdminUpdateBankConfigSchema), async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const userId = req.userId!;
  const newConfig = req.body;

  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: 'payment_bank_config' },
      update: { value: JSON.stringify(newConfig) },
      create: { key: 'payment_bank_config', value: JSON.stringify(newConfig) }
    });

    await dbService.createAuditLog(
      userId,
      'ADMIN_UPDATE_BANK_CONFIG',
      'system_settings',
      setting.id,
      null,
      newConfig
    );

    res.json({
      success: true,
      message: 'Cập nhật thông tin ngân hàng thành công!',
      config: newConfig
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3b. Admin List all plans (including Free & Inactive)
apiRouter.get('/admin/plans', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await getServicePlansConfig();
    const sorted = [...plans].sort((a, b) => a.order - b.order);
    res.json({
      success: true,
      plans: sorted
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3c. Admin Update a plan (Edit price, name, features, quota, status)
apiRouter.put('/admin/plans/:id', requireAdmin, validateBody(AdminUpdatePlanSchema), async (req: AuthRequest, res: Response) => {
  const planId = req.params.id.toUpperCase();
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const updateData = req.body;
  const prisma = getPrisma();

  try {
    const plans = await getServicePlansConfig();
    const index = plans.findIndex(p => p.id === planId);

    if (index === -1) {
      res.status(404).json({
        success: false,
        message: `Không tìm thấy gói dịch vụ có mã '${planId}'.`
      });
      return;
    }

    const oldPlan = plans[index];
    const durationDays = updateData.durationDays !== undefined ? Number(updateData.durationDays) : (oldPlan.durationDays || (planId === 'PERSONAL_3M' ? 90 : 30));
    const monthlyPrice = Number(updateData.monthlyPrice);
    const yearlyPrice = Number(updateData.yearlyPrice || 0);

    const updatedPlan: ServicePlanData = {
      ...oldPlan,
      name: updateData.name,
      description: updateData.description,
      price: monthlyPrice,
      monthlyPrice: monthlyPrice,
      yearlyPrice: yearlyPrice,
      durationDays: durationDays,
      type: updateData.type || oldPlan.type || (planId.includes('TEAM') ? 'TEAM' : 'PERSONAL'),
      maxTeamMembers: updateData.maxTeamMembers !== undefined ? Number(updateData.maxTeamMembers) : (oldPlan.maxTeamMembers ?? (planId.includes('TEAM') ? 5 : 0)),
      billingCycle: updateData.billingCycle || (durationDays === 90 ? '3 tháng (90 ngày)' : '1 tháng (30 ngày)'),
      status: updateData.status,
      order: Number(updateData.order ?? oldPlan.order),
      features: updateData.features || oldPlan.features,
      quota: updateData.quota ?? oldPlan.quota,
      badge: updateData.badge ?? oldPlan.badge,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail
    };

    const newPlans = [...plans];
    newPlans[index] = updatedPlan;

    // Save to system setting
    await prisma.systemSetting.upsert({
      where: { key: 'service_plans_config' },
      update: { value: JSON.stringify(newPlans) },
      create: { key: 'service_plans_config', value: JSON.stringify(newPlans) }
    });

    // Record Audit Log with old price vs new price
    await dbService.createAuditLog(
      adminId,
      'ADMIN_UPDATE_PLAN',
      'service_plans',
      planId,
      {
        planId,
        name: oldPlan.name,
        monthlyPrice: oldPlan.monthlyPrice,
        yearlyPrice: oldPlan.yearlyPrice,
        durationDays: oldPlan.durationDays,
        billingCycle: oldPlan.billingCycle,
        status: oldPlan.status,
        features: oldPlan.features,
        quota: oldPlan.quota
      },
      {
        planId,
        name: updatedPlan.name,
        monthlyPrice: updatedPlan.monthlyPrice,
        yearlyPrice: updatedPlan.yearlyPrice,
        durationDays: updatedPlan.durationDays,
        billingCycle: updatedPlan.billingCycle,
        status: updatedPlan.status,
        features: updatedPlan.features,
        quota: updatedPlan.quota,
        updatedBy: adminEmail,
        timestamp: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      message: `Cập nhật thông tin gói ${updatedPlan.name} thành công!`,
      plan: updatedPlan,
      plans: newPlans
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3d. Admin Plan Modification Audit History
apiRouter.get('/admin/plans/audit-history', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'ADMIN_UPDATE_PLAN' },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json({
      success: true,
      logs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3e. Admin Reset/Sync Plans to Official Defaults
apiRouter.post('/admin/plans/reset-defaults', requireAdmin, async (req: AuthRequest, res: Response) => {
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const prisma = getPrisma();
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'service_plans_config' },
      update: { value: JSON.stringify(DEFAULT_SERVICE_PLANS) },
      create: { key: 'service_plans_config', value: JSON.stringify(DEFAULT_SERVICE_PLANS) }
    });

    await dbService.createAuditLog(
      adminId,
      'ADMIN_RESET_PLANS',
      'service_plans',
      'ALL',
      null,
      { plans: DEFAULT_SERVICE_PLANS, updatedBy: adminEmail, timestamp: new Date().toISOString() }
    );

    res.json({
      success: true,
      message: 'Đã khôi phục và đồng bộ danh sách gói dịch vụ về cấu hình chính thức thành công!',
      plans: DEFAULT_SERVICE_PLANS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3f. Admin Languages - Full list
apiRouter.get('/admin/languages', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const languages = await getSystemLanguagesConfig();
    res.json({
      success: true,
      languages
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3g. Admin Languages - Update languages (Toggle status, set default, add)
apiRouter.put('/admin/languages', requireAdmin, validateBody(AdminUpdateLanguagesSchema), async (req: AuthRequest, res: Response) => {
  const adminId = req.userId!;
  const { languages } = req.body;
  const prisma = getPrisma();

  try {
    // Ensure at least one active language
    const hasActive = languages.some((l: any) => l.status === 'ACTIVE');
    if (!hasActive) {
      res.status(400).json({
        success: false,
        message: 'Hệ thống bắt buộc phải có ít nhất 1 ngôn ngữ hoạt động.'
      });
      return;
    }

    // Ensure exactly one default language
    const hasDefault = languages.some((l: any) => l.isDefault && l.status === 'ACTIVE');
    if (!hasDefault) {
      // Auto-set the first active language as default
      const firstActive = languages.find((l: any) => l.status === 'ACTIVE');
      if (firstActive) firstActive.isDefault = true;
    }

    await prisma.systemSetting.upsert({
      where: { key: 'system_languages_config' },
      update: { value: JSON.stringify(languages) },
      create: { key: 'system_languages_config', value: JSON.stringify(languages) }
    });

    await dbService.createAuditLog(
      adminId,
      'ADMIN_UPDATE_LANGUAGES',
      'system_settings',
      'system_languages_config',
      null,
      languages
    );

    res.json({
      success: true,
      message: 'Cập nhật cấu hình ngôn ngữ thành công!',
      languages
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3h. Admin Languages - Delete custom language
apiRouter.delete('/admin/languages/:code', requireAdmin, async (req: AuthRequest, res: Response) => {
  const adminId = req.userId!;
  const code = req.params.code.toLowerCase().trim();
  const prisma = getPrisma();

  try {
    const languages = await getSystemLanguagesConfig();
    const target = languages.find(l => l.code === code);
    if (!target) {
      res.status(404).json({ success: false, message: 'Không tìm thấy ngôn ngữ cần xóa.' });
      return;
    }
    if (target.isDefault) {
      res.status(400).json({ success: false, message: 'Không thể xóa ngôn ngữ đang được đặt làm mặc định.' });
      return;
    }
    if (code === 'vi') {
      res.status(400).json({ success: false, message: 'Ngôn ngữ Tiếng Việt là ngôn ngữ hệ thống bắt buộc, không thể xóa.' });
      return;
    }

    const filtered = languages.filter(l => l.code !== code);
    await prisma.systemSetting.upsert({
      where: { key: 'system_languages_config' },
      update: { value: JSON.stringify(filtered) },
      create: { key: 'system_languages_config', value: JSON.stringify(filtered) }
    });

    await dbService.createAuditLog(adminId, 'ADMIN_DELETE_LANGUAGE', 'system_settings', code, target, null);

    res.json({
      success: true,
      message: `Đã xóa ngôn ngữ ${target.name} (${target.code}) thành công.`,
      languages: filtered
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Create SaaS Checkout Session & Generate QR (Zero physical shipping, dynamic bank info & dynamic plan price)
apiRouter.post('/payments/checkout-session', paymentRateLimiter, validateBody(SaaSCheckoutSessionSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { plan, cycle, couponCode, paymentMethod } = req.body;
  const prisma = getPrisma();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true, planExpiresAt: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Tài khoản không tồn tại.' },
        message: 'Tài khoản không tồn tại.'
      });
      return;
    }

    // Fetch plan configuration from authoritative subscription service
    const planConfig = await subscriptionService.getPlanById(plan);

    if (!planConfig) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLAN', message: `Gói dịch vụ '${plan}' không tồn tại hoặc hiện đang tạm ngưng.` },
        message: `Gói dịch vụ '${plan}' không tồn tại hoặc hiện đang tạm ngưng.`
      });
      return;
    }

    // Backend strictly determines base price based on authoritative dynamic plan definition
    const subtotal = (cycle === 'yearly' && planConfig.yearlyPrice && planConfig.yearlyPrice > 0)
      ? planConfig.yearlyPrice
      : planConfig.price;

    // Validate Coupon if provided
    let discountPercent = 0;
    let couponRecord: any = null;
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.toUpperCase().trim();
      couponRecord = await prisma.coupon.findUnique({ where: { code: cleanCode } });
      if (couponRecord && couponRecord.status === 'Active') {
        const notExpired = !couponRecord.expiresAt || new Date(couponRecord.expiresAt).getTime() >= Date.now();
        const hasRemainingUses = couponRecord.usedCount < couponRecord.maxUses;
        if (notExpired && hasRemainingUses) {
          discountPercent = couponRecord.discountPercent;
        }
      }
    }

    const discount = Math.round((subtotal * discountPercent) / 100);
    const total = Math.max(0, subtotal - discount);

    // Get dynamic bank config
    const bankConfig = await getPaymentBankConfig();

    if (bankConfig.isActive === false) {
      res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_METHOD_INACTIVE', message: 'Phương thức thanh toán chuyển khoản ngân hàng hiện đang tạm ngưng.' },
        message: 'Phương thức thanh toán chuyển khoản ngân hàng hiện đang tạm ngưng.'
      });
      return;
    }

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const prefix = (bankConfig.transferPrefix || 'DUOTECH').trim();
    const txReference = `${prefix} ${orderId}`;

    const orderMetadata = {
      plan: planConfig.id,
      planName: planConfig.name,
      planType: planConfig.type,
      cycle: planConfig.billingCycle,
      durationDays: planConfig.durationDays,
      subtotal,
      discount,
      total,
      couponCode: discountPercent > 0 ? couponCode : null,
      paymentMethod: paymentMethod || 'vietqr'
    };

    // Create pending Order and Payment
    const [order, payment] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId,
          orderId,
          items: JSON.stringify([orderMetadata]),
          subtotal,
          discount,
          total,
          status: 'PENDING',
          couponCode: discountPercent > 0 ? couponCode : null
        }
      }),
      prisma.payment.create({
        data: {
          userId,
          customerEmail: user.email,
          orderId,
          planRequested: plan as any,
          amount: total,
          method: 'VietQR Bank Transfer',
          status: 'PENDING',
          txReference,
          billingCycle: cycle,
          note: JSON.stringify({
            ...orderMetadata,
            snapshotAt: new Date().toISOString(),
            appliedPrice: total,
            planConfigSnapshot: {
              id: planConfig.id,
              name: planConfig.name,
              price: planConfig.price,
              billingCycle: planConfig.billingCycle
            }
          })
        }
      })
    ]);

    const dynamicQrUrl = `https://img.vietqr.io/image/${bankConfig.bankCode || 'MB'}-${bankConfig.accountNumber}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(txReference)}&accountName=${encodeURIComponent(bankConfig.accountHolder)}`;
    const qrUrl = bankConfig.qrImageUrl && bankConfig.qrImageUrl.trim() ? bankConfig.qrImageUrl : dynamicQrUrl;

    res.json({
      success: true,
      checkoutSession: {
        orderId: order.orderId,
        paymentId: payment.id,
        txReference,
        plan,
        planName: planConfig.name,
        cycle,
        durationText: cycle === 'yearly' ? '1 năm (365 ngày)' : '1 tháng (30 ngày)',
        subtotal,
        discount,
        discountPercent,
        total,
        customerEmail: user.email,
        paymentMethod: 'vietqr',
        bankInfo: {
          bankName: bankConfig.bankName,
          accountNumber: bankConfig.accountNumber,
          accountHolder: bankConfig.accountHolder,
          bankCode: bankConfig.bankCode || 'MB',
          amount: total,
          transferMemo: txReference,
          qrUrl,
          dynamicQrUrl,
          customQrUrl: bankConfig.qrImageUrl || null
        },
        status: 'PENDING'
      }
    });
  } catch (err: any) {
    console.error('Create checkout session error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_SESSION_FAILED', message: err.message },
      message: err.message
    });
  }
});

// 5. Submit Payment Request (Customer clicks "Tôi đã thanh toán" -> Does NOT auto-upgrade, awaits Admin Approval)
apiRouter.post('/payments/submit-request', paymentRateLimiter, validateBody(SubmitPaymentRequestSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { orderId, note } = req.body;
  const prisma = getPrisma();

  try {
    const payment = await prisma.payment.findFirst({
      where: { orderId, userId }
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Không tìm thấy thông tin đơn hàng này.' },
        message: 'Không tìm thấy thông tin đơn hàng này.'
      });
      return;
    }

    if (payment.status === 'APPROVED' || payment.status === 'Paid') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_APPROVED', message: 'Yêu cầu thanh toán này đã được duyệt và kích hoạt trước đó.' },
        message: 'Yêu cầu thanh toán này đã được duyệt và kích hoạt trước đó.'
      });
      return;
    }

    // Update note and ensure PENDING status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PENDING',
        note: note ? String(note).trim() : (payment.note || 'Khách hàng đã báo hoàn tất chuyển khoản')
      }
    });

    // Notify administrators of pending upgrade request
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { id: true }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Yêu cầu nâng cấp gói mới (${payment.planRequested})`,
            message: `Khách hàng ${req.user.email} vừa báo đã chuyển khoản ${payment.amount.toLocaleString('vi-VN')} ₫ (${payment.txReference}). Vui lòng kiểm tra và duyệt.`,
            type: 'Info',
            read: false
          }
        });
      }
    } catch (notifErr) {
      console.warn('Failed to notify admins:', notifErr);
    }

    res.json({
      success: true,
      message: 'Yêu cầu đã được gửi. Vui lòng chờ quản trị viên xác nhận thanh toán.',
      payment: updatedPayment
    });
  } catch (err: any) {
    console.error('Submit payment request error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SUBMIT_REQUEST_FAILED', message: err.message },
      message: err.message
    });
  }
});

// 6. Get Current User's Payment / Upgrade Requests
apiRouter.get('/payments/my-requests', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const requests = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      requests
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Get Active Pending Request for Dashboard / Checkout Banner
apiRouter.get('/payments/active-pending-request', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const activePending = await prisma.payment.findFirst({
      where: {
        userId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      activePending: activePending || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Cancel Pending Request (Customer initiated)
apiRouter.post('/payments/cancel-request', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { orderId } = req.body;
  const prisma = getPrisma();

  try {
    const payment = await prisma.payment.findFirst({
      where: { orderId, userId, status: 'PENDING' }
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu chờ duyệt hợp lệ để hủy.'
      });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED' }
    });

    await prisma.order.updateMany({
      where: { orderId, userId },
      data: { status: 'CANCELLED' }
    });

    // Auto-adjust / cancel referral commission if already granted
    try {
      await referralService.processOrderCancelledOrRefunded(orderId, 'Người dùng hủy yêu cầu thanh toán');
    } catch (refErr) {
      console.warn('[Referral] Error handling cancelled order commission:', refErr);
    }

    res.json({
      success: true,
      message: 'Đã hủy yêu cầu thanh toán thành công.',
      payment: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Admin List Payment Requests with Filters & Counts
apiRouter.get('/admin/payments/requests', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const { status, plan, search } = req.query;

  try {
    const whereClause: any = {};

    if (status && status !== 'ALL') {
      if (status === 'PENDING') whereClause.status = 'PENDING';
      else if (status === 'APPROVED') whereClause.status = { in: ['APPROVED', 'Paid'] };
      else if (status === 'REJECTED') whereClause.status = 'REJECTED';
      else if (status === 'CANCELLED') whereClause.status = 'CANCELLED';
      else whereClause.status = String(status);
    }

    if (plan && plan !== 'ALL') {
      whereClause.planRequested = plan;
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      whereClause.OR = [
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { orderId: { contains: q, mode: 'insensitive' } },
        { txReference: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const requests = await prisma.payment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            plan: true,
            planExpiresAt: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: 100
    });

    // Counts for badge display
    const [allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: { in: ['APPROVED', 'Paid'] } } }),
      prisma.payment.count({ where: { status: 'REJECTED' } })
    ]);

    res.json({
      success: true,
      requests,
      counts: {
        all: allCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Admin Approve Payment & Upgrade User Plan (Idempotent Transaction)
apiRouter.post('/admin/payments/:id/approve', requireAdmin, async (req: AuthRequest, res: Response) => {
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const paymentId = req.params.id;
  const prisma = getPrisma();

  try {
    // 1. Check request exists and is PENDING
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Không tìm thấy yêu cầu thanh toán này.' },
        message: 'Không tìm thấy yêu cầu thanh toán này.'
      });
      return;
    }

    if (payment.status === 'APPROVED' || payment.status === 'Paid') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_APPROVED', message: `Yêu cầu này đã được duyệt trước đó bởi ${payment.approvedBy || 'quản trị viên'}.` },
        message: `Yêu cầu này đã được duyệt trước đó bởi ${payment.approvedBy || 'quản trị viên'}.`
      });
      return;
    }

    if (payment.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Yêu cầu đang ở trạng thái "${payment.status}", không thể duyệt.` },
        message: `Yêu cầu đang ở trạng thái "${payment.status}", không thể duyệt.`
      });
      return;
    }

    // 2. Activate subscription via centralized service with price snapshot
    const now = new Date();
    const subscription = await subscriptionService.activateSubscription(payment.userId, payment.planRequested, {
      txReference: payment.txReference || `TX_${payment.orderId}`,
      paymentId: payment.id,
      amount: payment.amount
    });

    // 3. Update payment and order records
    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'APPROVED',
          approvedAt: now,
          approvedBy: adminEmail
        }
      }),
      prisma.order.updateMany({
        where: { orderId: payment.orderId },
        data: { status: 'APPROVED' }
      })
    ]);

    const updatedUser = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true, avatar: true }
    });

    const planToActivate = subscription.planName || payment.planRequested;
    const planExpiresAt = subscription.endDate;

    // 4. Create Notification for the customer
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: `Yêu cầu nâng cấp gói ${planToActivate} đã được duyệt!`,
        message: `Quản trị viên đã xác nhận thanh toán (${payment.txReference}). Tài khoản của bạn đã được nâng cấp lên gói ${planToActivate}, thời hạn sử dụng đến ngày ${new Date(planExpiresAt).toLocaleDateString('vi-VN')}.`,
        type: 'Success',
        read: false
      }
    });

    // 4.1. Send Gmail notification to customer
    if (updatedUser?.email) {
      gmailService.sendNotification({
        to: updatedUser.email,
        recipientName: updatedUser.name || 'Khách hàng',
        subject: `🎉 [Life OS] Đơn thanh toán đã được duyệt - Kích hoạt gói ${planToActivate}`,
        category: 'PAYMENT',
        headline: `Chúc mừng bạn! Gói ${planToActivate} đã được kích hoạt`,
        content: `Yêu cầu thanh toán của bạn (Mã: <strong>${payment.txReference || payment.orderId}</strong>, số tiền: <strong>${(payment.amount || 0).toLocaleString('vi-VN')} ₫</strong>) đã được quản trị viên xác nhận và duyệt thành công.<br/><br/>Tài khoản của bạn đã được nâng cấp lên gói <strong>${planToActivate}</strong>, hạn dùng đến ngày <strong>${new Date(planExpiresAt).toLocaleDateString('vi-VN')}</strong>. Bạn có thể sử dụng đầy đủ mọi tính năng cao cấp của Life OS ngay bây giờ.`,
        actionLabel: 'Truy cập Life OS ngay',
        actionUrl: 'http://localhost:5173',
        badgeText: 'Thanh toán thành công',
        badgeColor: '#10b981'
      }).catch(e => console.error('[Gmail] Error sending payment approve email:', e));
    }

    // 5. Calculate and award 30% Referral Commission (if customer was referred)
    try {
      await referralService.processOrderApproved(
        payment.orderId,
        payment.amount || 0,
        payment.userId
      );
    } catch (refErr) {
      console.warn('[Referral] Error processing commission on payment approval:', refErr);
    }

    // 6. Create Audit Log
    await dbService.createAuditLog(
      adminId,
      'ADMIN_APPROVE_PAYMENT',
      'payments',
      payment.id,
      { status: 'PENDING' },
      { status: 'APPROVED', plan: planToActivate, planExpiresAt, approvedBy: adminEmail, amount: payment.amount }
    );

    res.json({
      success: true,
      message: `Đã duyệt thanh toán thành công! Gói ${planToActivate} đã được kích hoạt cho khách hàng.`,
      payment: updatedPayment,
      user: updatedUser,
      subscription
    });
  } catch (err: any) {
    console.error('Admin approve payment error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'APPROVE_FAILED', message: err.message },
      message: err.message
    });
  }
});

// 11. Admin Reject Payment Request
apiRouter.post('/admin/payments/:id/reject', requireAdmin, validateBody(AdminRejectPaymentSchema), async (req: AuthRequest, res: Response) => {
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const paymentId = req.params.id;
  const { reason } = req.body;
  const prisma = getPrisma();

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Không tìm thấy yêu cầu thanh toán này.' },
        message: 'Không tìm thấy yêu cầu thanh toán này.'
      });
      return;
    }

    if (payment.status === 'APPROVED' || payment.status === 'Paid') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_APPROVED', message: 'Không thể từ chối yêu cầu đã được duyệt thành công.' },
        message: 'Không thể từ chối yêu cầu đã được duyệt thành công.'
      });
      return;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        approvedBy: adminEmail,
        updatedAt: new Date()
      }
    });

    await prisma.order.updateMany({
      where: { orderId: payment.orderId },
      data: { status: 'REJECTED' }
    });

    // Notify customer in-app
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: `Yêu cầu thanh toán gói ${payment.planRequested} bị từ chối`,
        message: `Yêu cầu thanh toán (${payment.txReference}) đã bị từ chối. Lý do: ${reason}`,
        type: 'Error',
        read: false
      }
    });

    // Send Gmail notification to customer
    const targetEmail = payment.user?.email || payment.customerEmail;
    if (targetEmail) {
      gmailService.sendNotification({
        to: targetEmail,
        recipientName: payment.user?.name || 'Khách hàng',
        subject: `⚠️ [Life OS] Thông báo về yêu cầu thanh toán gói ${payment.planRequested}`,
        category: 'PAYMENT',
        headline: 'Yêu cầu thanh toán không được phê duyệt',
        content: `Yêu cầu thanh toán của bạn cho mã đơn <strong>${payment.txReference || payment.orderId}</strong> chưa được xác nhận bởi quản trị viên.<br/><br/><strong>Lý do từ chối:</strong> ${reason || 'Thông tin chuyển khoản không trùng khớp hoặc chưa nhận được tiền.'}<br/><br/>Nếu có thắc mắc hoặc cần hỗ trợ, vui lòng phản hồi lại email này hoặc liên hệ quản trị viên để được kiểm tra lại.`,
        actionLabel: 'Kiểm tra tài khoản',
        actionUrl: 'http://localhost:5173',
        badgeText: 'Từ chối thanh toán',
      }).catch(e => console.error('[Gmail] Error sending payment reject email:', e));
    }

    // Auto-adjust / cancel referral commission if already granted
    try {
      await referralService.processOrderCancelledOrRefunded(payment.orderId, `Thanh toán bị từ chối: ${reason}`);
    } catch (refErr) {
      console.warn('[Referral] Error handling rejected payment commission rollback:', refErr);
    }

    // Audit Log
    await dbService.createAuditLog(
      adminId,
      'ADMIN_REJECT_PAYMENT',
      'payments',
      payment.id,
      { status: payment.status },
      { status: 'REJECTED', reason, rejectedBy: adminEmail }
    );

    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu thanh toán.',
      payment: updatedPayment
    });
  } catch (err: any) {
    console.error('Admin reject payment error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'REJECT_FAILED', message: err.message },
      message: err.message
    });
  }
});

// 11b. Admin Process Payment Refund & Immediate Subscription Revocation (Requirements 9, 10)
apiRouter.post('/admin/payments/:id/refund', requireAdmin, async (req: AuthRequest, res: Response) => {
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const paymentId = req.params.id;
  const { reason } = req.body;

  try {
    const result = await subscriptionService.cancelSubscriptionOnRefund(paymentId, reason, adminEmail);

    await dbService.createAuditLog(
      adminId,
      'ADMIN_REFUND_PAYMENT',
      'payments',
      paymentId,
      null,
      { reason, refundedBy: adminEmail }
    );

    res.json({
      success: true,
      message: 'Đã hoàn tiền và thu hồi quyền gói dịch vụ thành công!',
      payment: result.payment,
      user: result.user
    });
  } catch (err: any) {
    console.error('Admin refund error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11c. Admin Subscriptions Monitoring & Audit (Requirement 13)
apiRouter.get('/admin/subscriptions', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, search, planId, page, limit } = req.query;

  try {
    const result = await subscriptionService.getSubscriptionsList({
      status: status ? String(status) : 'ALL',
      search: search ? String(search) : undefined,
      planId: planId ? String(planId) : 'ALL',
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 50
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. Get User Subscription & Billing History
apiRouter.get('/payments/subscription', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const subStatus = await subscriptionService.checkUserSubscription(userId);

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const activePending = await prisma.payment.findFirst({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });

    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      hasAccess: subStatus.hasAccess,
      currentPlan: subStatus.planId,
      planType: subStatus.planType,
      planName: subStatus.planName,
      status: subStatus.status,
      planExpiresAt: subStatus.endDate || null,
      startDate: subStatus.startDate || null,
      remainingDays: subStatus.remainingDays,
      amount: subStatus.amount,
      isTeamOwner: subStatus.isTeamOwner || false,
      isTeamMember: subStatus.isTeamMember || false,
      teamId: subStatus.teamId,
      teamName: subStatus.teamName,
      teamOwnerEmail: subStatus.teamOwnerEmail,
      subscriptionId: subStatus.subscriptionId,
      role: subStatus.role,
      subscription: latestSubscription,
      history: payments,
      activePending
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// TEAM MANAGEMENT ENDPOINTS (Strictly enforced by Backend & Max 5 Members)
// --------------------------------------------------------------------------
apiRouter.get('/team/my-team', async (req: AuthRequest, res: Response) => {
  try {
    const teamData = await teamService.getMyTeam(req.userId!);
    res.json({
      success: true,
      ...teamData
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/team/name', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên nhóm không được để trống.' });
    }
    const team = await teamService.createOrUpdateTeamName(req.userId!, name);
    res.json({
      success: true,
      message: 'Cập nhật tên nhóm thành công.',
      team
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

apiRouter.post('/team/members', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email của thành viên.' });
    }
    const result = await teamService.addMember(req.userId!, email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: (err as any).code || 'ADD_MEMBER_FAILED', message: err.message },
      message: err.message
    });
  }
});

apiRouter.delete('/team/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await teamService.removeMember(req.userId!, userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REMOVE_MEMBER_FAILED', message: err.message },
      message: err.message
    });
  }
});

apiRouter.get('/team/invite-code', async (req: AuthRequest, res: Response) => {
  try {
    const result = await teamService.getOrGenerateInviteCode(req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

apiRouter.post('/team/join', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã mời.' });
    }
    const result = await teamService.joinTeamByCode(req.userId!, code);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: (err as any).code || 'JOIN_TEAM_FAILED', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// ADMIN SUPPORT & TESTING ENDPOINTS
// --------------------------------------------------------------------------
apiRouter.post('/payments/simulate-instant-activation', requireAdmin, async (req: AuthRequest, res: Response) => {
  const userId = req.body.userId || req.userId!;
  const { planId } = req.body;
  try {
    const sub = await subscriptionService.activateSubscription(userId, planId || 'PERSONAL_1M', {
      txReference: `ADMIN_ACT_${Date.now()}`
    });
    res.json({
      success: true,
      message: `Đã kích hoạt thành công gói ${sub.planName}!`,
      subscription: sub
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

apiRouter.post('/payments/simulate-expire', requireAdmin, async (req: AuthRequest, res: Response) => {
  const userId = req.body.userId || req.userId!;
  const prisma = getPrisma();
  try {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day in the past
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'EXPIRED', endDate: pastDate }
    });
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'FREE', planExpiresAt: pastDate }
    });
    res.json({
      success: true,
      message: 'Đã thiết lập trạng thái gói dịch vụ sang hết hạn để kiểm tra.'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 13. Cancel Auto-Renew (Does NOT immediately revoke pro privileges)
apiRouter.post('/payments/subscription/cancel-auto-renew', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },  // FUNC-002 FIX: was 'Active' — case mismatch with ACTIVE from activateSubscription()
      orderBy: { createdAt: 'desc' }
    });

    if (latestSubscription) {
      await prisma.subscription.update({
        where: { id: latestSubscription.id },
        data: { status: 'CANCELLED' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true }
    });

    const expiryFormatted = user?.planExpiresAt
      ? new Date(user.planExpiresAt).toLocaleDateString('vi-VN')
      : 'kết thúc chu kỳ';

    res.json({
      success: true,
      message: `Đã hủy tự động gia hạn thành công. Bạn vẫn tiếp tục được sử dụng đầy đủ quyền lợi gói ${user?.plan || 'dịch vụ'} đến hết ngày ${expiryFormatted}.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 14. Resume Auto-Renew
apiRouter.post('/payments/subscription/resume-auto-renew', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (latestSubscription) {
      await prisma.subscription.update({
        where: { id: latestSubscription.id },
        data: { status: 'Active' }
      });
    }

    res.json({
      success: true,
      message: 'Đã khôi phục tự động gia hạn thành công.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 15. Admin-only manual plan assignment (Security hardened: regular users cannot self-assign)
apiRouter.post('/auth/upgrade-plan', requireAdmin, validateBody(UpgradePlanSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { plan } = req.body;
  const prisma = getPrisma();

  try {
    const durationDays = 30;
    const planExpiresAt = plan === 'FREE' ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planExpiresAt
      },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true, avatar: true }
    });

    if (plan !== 'FREE') {
      await prisma.subscription.create({
        data: {
          userId,
          planId: plan === 'TEAM' ? 'TEAM_1M' : 'PERSONAL_1M',
          planType: plan === 'TEAM' ? 'TEAM' : 'PERSONAL',
          planName: plan === 'TEAM' ? 'Gói Đội Ngũ (Team 1 Tháng)' : 'Gói Cá Nhân (1 Tháng)',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          amount: plan === 'TEAM' ? 50000 : 15000,
          startDate: new Date(),
          endDate: planExpiresAt!
        }
      });
    }

    res.json({
      success: true,
      message: `Đã cập nhật gói thành công sang ${plan}`,
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// SAAS CUSTOMER OPERATIONS & LIFECYCLE MANAGEMENT ENDPOINTS
// --------------------------------------------------------------------------

// 16. Admin SaaS KPI Metrics & Revenue Dashboard
apiRouter.get('/admin/saas-metrics', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await subscriptionService.getSaaSMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 17. Admin Grant / Extend Subscription manually
apiRouter.post('/admin/users/:id/grant-subscription', requireAdmin, async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const { planId, durationDays, reason } = req.body;

  try {
    const duration = parseInt(durationDays) || 30;
    const subscription = await subscriptionService.grantSubscription(
      targetUserId,
      planId || 'PERSONAL_1M',
      duration,
      adminEmail,
      reason || 'Cấp quyền thủ công bởi Admin'
    );

    await dbService.createAuditLog(
      adminId,
      'ADMIN_GRANT_SUBSCRIPTION',
      'subscriptions',
      subscription.id,
      null,
      { targetUserId, planId: subscription.planId, durationDays: duration, reason }
    );

    res.json({
      success: true,
      message: `Đã cấp quyền sử dụng gói ${subscription.planName} (${duration} ngày) thành công!`,
      subscription
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 18. Admin Revoke Subscription manually
apiRouter.post('/admin/users/:id/revoke-subscription', requireAdmin, async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;
  const adminId = req.userId!;
  const adminEmail = req.user.email;
  const { reason } = req.body;

  try {
    const updatedUser = await subscriptionService.revokeSubscription(
      targetUserId,
      adminEmail,
      reason || 'Thu hồi bởi quản trị viên'
    );

    await dbService.createAuditLog(
      adminId,
      'ADMIN_REVOKE_SUBSCRIPTION',
      'users',
      targetUserId,
      null,
      { reason, revokedBy: adminEmail }
    );

    res.json({
      success: true,
      message: 'Đã thu hồi gói dịch vụ của khách hàng thành công. Tài khoản trở về trạng thái chưa kích hoạt.',
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 19. Admin Get Customer Operational Detail
apiRouter.get('/admin/users/:id/detail', requireAdmin, async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;
  const prisma = getPrisma();

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        avatar: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompleted: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    const [subscriptions, payments, subStatus, internalNoteSetting] = await Promise.all([
      prisma.subscription.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.payment.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      subscriptionService.checkUserSubscription(targetUserId),
      prisma.systemSetting.findUnique({
        where: { key: `admin_note_user_${targetUserId}` }
      })
    ]);

    res.json({
      success: true,
      user,
      subscriptionStatus: subStatus,
      subscriptions,
      payments,
      adminNote: internalNoteSetting?.value || ''
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 20. Admin Save Internal Customer Note
apiRouter.put('/admin/users/:id/admin-notes', requireAdmin, async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;
  const { note } = req.body;
  const prisma = getPrisma();

  try {
    await prisma.systemSetting.upsert({
      where: { key: `admin_note_user_${targetUserId}` },
      update: { value: String(note || '') },
      create: { key: `admin_note_user_${targetUserId}`, value: String(note || '') }
    });

    res.json({
      success: true,
      message: 'Đã lưu ghi chú vận hành nội bộ thành công!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 21. Automated Webhook / Instant Payment Simulation
apiRouter.post('/payments/webhook-simulate', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { orderId, txReference } = req.body;
  const prisma = getPrisma();

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ orderId: String(orderId) }] : []),
          ...(txReference ? [{ txReference: String(txReference) }] : [])
        ]
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch tương ứng.' });
    }

    if (payment.status === 'APPROVED' || payment.status === 'Paid') {
      return res.json({ success: true, message: 'Giao dịch đã được duyệt trước đó (Idempotent).', payment });
    }

    // Activate subscription
    const sub = await subscriptionService.activateSubscription(payment.userId, payment.planRequested, {
      txReference: payment.txReference || `WH_${Date.now()}`,
      paymentId: payment.id,
      amount: payment.amount
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: 'SYSTEM_WEBHOOK'
      }
    });

    await prisma.order.updateMany({
      where: { orderId: payment.orderId },
      data: { status: 'APPROVED' }
    });

    res.json({
      success: true,
      message: `Xác nhận webhook tự động thành công! Đã kích hoạt gói ${sub.planName}.`,
      subscription: sub
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 5D HARMONY METRICS ENGINE (REAL DATA ONLY - NO MOCK, NO FAKE DEFAULTS)
// --------------------------------------------------------------------------
apiRouter.get('/life-harmony', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const harmony = await lifeHarmonyService.get5DHarmony(userId);
    res.json({
      success: true,
      data: harmony
    });
  } catch (err: any) {
    console.error('GET /api/life-harmony error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tính toán chỉ số 5D Harmony'
    });
  }
});

// --------------------------------------------------------------------------
// TODAY ENGINE: UNIFIED LIFE OPERATING SYSTEM (Zero AI)
// --------------------------------------------------------------------------
apiRouter.get('/today', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch in parallel
    // PERF-001 FIX: Added filters on tasks to avoid loading ALL tasks (could be 10k+)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [tasks, events, habits, habitLogs, focusSessions, accounts, budgets] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          status: { notIn: ['Hoàn thành', 'Đã xong', 'Hủy'] },
          OR: [
            { dueDate: { gte: sevenDaysAgo } },
            { dueDate: null }
          ]
        },
        take: 200,
        orderBy: { dueDate: 'asc' }
      }),
      prisma.calendarEvent.findMany({ where: { userId, date: todayStr } }),
      prisma.habit.findMany({ where: { userId, status: 'Active' } }),
      prisma.habitLog.findMany({ where: { date: todayStr, habit: { userId } } }),
      prisma.focusSession.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
      prisma.financeAccount.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } })
    ]);

    const habitLogMap = new Map(habitLogs.map(l => [l.habitId, l]));

    // Categorize Tasks
    const overdueTasks: any[] = [];
    const mustDoTasks: any[] = [];
    const shouldDoTasks: any[] = [];
    const optionalTasks: any[] = [];
    const completedToday: any[] = [];

    for (const t of tasks) {
      if (t.status === 'Hoàn thành') {
        completedToday.push(t);
        continue;
      }

      if (t.dueDate && t.dueDate < todayStr) {
        overdueTasks.push(t);
      } else if (t.dueDate === todayStr || t.startDate === todayStr || !t.dueDate) {
        if (t.priority === 'Khẩn cấp' || t.priority === 'Cao') {
          mustDoTasks.push(t);
        } else if (t.priority === 'Trung bình') {
          shouldDoTasks.push(t);
        } else {
          optionalTasks.push(t);
        }
      }
    }

    // Process habits
    const habitsToday = habits.map(h => ({
      ...h,
      completedToday: habitLogMap.has(h.id) && habitLogMap.get(h.id)?.completed
    }));

    // Financial balance summary
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const budgetWarnings = budgets.filter(b => b.limit > 0 && b.spent >= b.limit * 0.9);

    res.json({
      success: true,
      date: todayStr,
      summary: {
        totalTasks: tasks.length,
        overdueCount: overdueTasks.length,
        mustDoCount: mustDoTasks.length,
        todayEventsCount: events.length,
        habitsCompletedCount: habitsToday.filter(h => h.completedToday).length,
        habitsTotalCount: habitsToday.length,
        totalBalance
      },
      schedule: events,
      tasks: {
        overdue: overdueTasks,
        mustDo: mustDoTasks,
        shouldDo: shouldDoTasks,
        optional: optionalTasks,
        completedToday
      },
      habits: habitsToday,
      budgetWarnings
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'TODAY_ENGINE_ERROR', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// FINANCIAL TRANSACTIONS (ACID Transactional Guarantee)
// --------------------------------------------------------------------------
apiRouter.post('/finance/transaction', validateBody(FinanceTransactionSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const result = await dbService.executeFinanceTransaction(userId, req.body);
    res.json({ success: true, transaction: result });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'TRANSACTION_ERROR', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// FOCUS SESSION COMPLETION WITH TIME TRACKING LINKAGE
// --------------------------------------------------------------------------
apiRouter.post('/focus/complete', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { title, mode, plannedDuration, actualDuration, taskId, subjectId } = req.body;
  const prisma = getPrisma();

  try {
    const durationMins = parseFloat(actualDuration) || parseFloat(plannedDuration) || 25;
    const durationHours = durationMins / 60;

    // 1. Create focus session
    const session = await prisma.focusSession.create({
      data: {
        userId,
        title: title || 'Phiên tập trung',
        mode: mode || 'Pomodoro',
        status: 'Completed',
        plannedDuration: parseFloat(plannedDuration) || 25,
        actualDuration: durationMins,
        startTime: new Date().toISOString()
      }
    });

    // 2. Link & update Task actualHours if linked
    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
      if (task) {
        await prisma.task.update({
          where: { id: taskId },
          data: { actualHours: { increment: durationHours } }
        });
      }
    }

    // 3. Link & create StudySession if linked
    if (subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
      if (subject) {
        await prisma.studySession.create({
          data: {
            userId,
            subjectId,
            durationMinutes: Math.round(durationMins),
            date: new Date().toISOString().split('T')[0],
            notes: `Phiên tập trung: ${session.title}`
          }
        });
      }
    }

    // 4. Trigger automation event
    await AutomationEngineService.triggerEvent(userId, 'focus.completed', {
      sessionId: session.id,
      durationMinutes: durationMins
    });

    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FOCUS_ERROR', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// DECISION ENGINE (Deterministic Mathematical Matrix Evaluation)
// --------------------------------------------------------------------------
apiRouter.post('/decisions/:id/select-option', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { optionId, reasoning } = req.body;

  try {
    const decision = await dbService.getUserCollection('decisions', userId);
    const target = decision.find((d: any) => d.id === id);
    if (!target) {
      res.status(404).json({ success: false, message: 'Quyết định không tồn tại' });
      return;
    }

    const updated = await dbService.updateUserCollectionItem('decisions', userId, id, {
      selectedOptionId: optionId,
      status: 'Decided',
      outcome: reasoning || target.outcome
    });

    await dbService.createAuditLog(
      userId,
      'SELECT_DECISION_OPTION',
      'decisions',
      id,
      { beforeOption: target.selectedOptionId },
      { selectedOptionId: optionId, reasoning }
    );

    res.json({ success: true, decision: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/decisions/evaluate', async (req: AuthRequest, res: Response) => {
  try {
    const { criteria, options, risks, scenarios } = req.body;
    const result = DecisionEngineService.evaluateDecision({
      criteria: criteria || [],
      options: options || [],
      risks: risks || [],
      scenarios: scenarios || []
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Lỗi đánh giá quyết định' });
  }
});

apiRouter.post('/decisions/:id/convert-execution', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const prisma = getPrisma();
    const decision = await prisma.decision.findFirst({ where: { id, userId } });
    if (!decision) {
      res.status(404).json({ success: false, message: 'Quyết định không tồn tại' });
      return;
    }

    // Convert to project & execution tasks
    const project = await prisma.project.create({
      data: {
        userId,
        name: `Triển khai: ${decision.title}`,
        description: `Dự án thực thi từ quyết định: ${decision.problem || decision.title}`,
        status: 'Đang làm',
        health: 'Tốt',
        progress: 0
      }
    });

    const task = await prisma.task.create({
      data: {
        userId,
        projectId: project.id,
        title: `Kế hoạch hành động ban đầu - ${decision.title}`,
        description: `Bắt đầu thực thi phương án đã chọn trong Decision Engine`,
        status: 'Chưa làm',
        priority: 'Cao',
        estimatedHours: 4
      }
    });

    await prisma.decision.update({
      where: { id },
      data: {
        status: 'Executing',
        outcome: `Dự án thực thi: ${project.name}`
      }
    });

    res.json({ success: true, projectId: project.id, taskId: task.id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// AUTOMATION ENGINE (Deterministic Rule Evaluation)
// --------------------------------------------------------------------------
apiRouter.post('/automations/evaluate', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const trigger = req.body.triggerType || req.body.event?.type || 'MANUAL';
    const context = req.body.eventContext || req.body.event || {};
    const results = await AutomationEngineService.triggerEvent(userId, trigger, context);
    res.json({ success: true, result: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// USER SETTINGS & WORKSPACE CLEANUP
// --------------------------------------------------------------------------
apiRouter.get('/settings', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const settings = await dbService.getUserSettings(userId);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/settings', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const updated = await dbService.updateUserSettings(userId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/clear-workspace', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await dbService.clearUserWorkspace(userId);
    res.json({ success: true, message: 'Đã làm sạch không gian làm việc' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/seed-sample', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    await dbService.seedUserSampleData(userId);
    res.json({ success: true, message: 'Đã nạp dữ liệu mẫu thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// ADMIN CONSOLE ENDPOINTS (Admin & SuperAdmin only)
// --------------------------------------------------------------------------
apiRouter.get('/admin/metrics', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const [
      totalUsers,
      activeUsers,
      freeUsers,
      proUsers,
      teamUsers,
      totalOrders,
      orders,
      auditCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { plan: 'FREE' } }),
      prisma.user.count({ where: { plan: 'PRO' } }),
      prisma.user.count({ where: { plan: 'TEAM' } }),
      prisma.order.count(),
      prisma.order.findMany({ select: { total: true } }),
      prisma.auditLog.count()
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    res.json({
      success: true,
      metrics: {
        totalUsers,
        activeUsers,
        plans: {
          free: freeUsers,
          pro: proUsers,
          team: teamUsers
        },
        totalOrders,
        totalRevenue,
        auditCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.get('/admin/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, plan, status, page, limit } = req.query;
    const result = await dbService.getUsers({
      search: search as string,
      role: role as string,
      plan: plan as string,
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/admin/users', requireAdmin, validateBody(AdminCreateUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, plan, temporaryPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const existing = await dbService.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email đã tồn tại trong hệ thống' },
        message: 'Email đã tồn tại trong hệ thống'
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(temporaryPassword), salt);

    const newUser = await dbService.createUser({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: (role || 'USER').toUpperCase() as any,
      plan: (plan || 'FREE').toUpperCase() as any,
      status: 'ACTIVE'
    });

    await dbService.createAuditLog(
      req.userId!,
      'ADMIN_CREATE_USER',
      'users',
      newUser.id,
      null,
      { email: newUser.email, role: newUser.role, plan: newUser.plan }
    );

    res.status(201).json({
      success: true,
      message: `Đã khởi tạo tài khoản cho ${newUser.name}`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/admin/users/:id/status', requireAdmin, validateBody(AdminUpdateStatusSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    const updated = await dbService.updateUser(id, { status });

    // If disabled or suspended, terminate all their active sessions immediately
    if (status === 'DISABLED' || status === 'SUSPENDED') {
      await dbService.deleteAllUserSessions(id);
    }

    await dbService.createAuditLog(
      req.userId!,
      'ADMIN_UPDATE_USER_STATUS',
      'users',
      id,
      { beforeStatus: user.status },
      { newStatus: status, reason }
    );

    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/admin/users/:id/plan', requireAdmin, validateBody(AdminChangePlanSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { plan, durationMonths, reason } = req.body;

  try {
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    let planExpiresAt: Date | null = null;
    if (durationMonths && durationMonths > 0) {
      const baseDate = user.planExpiresAt && user.planExpiresAt.getTime() > Date.now()
        ? new Date(user.planExpiresAt)
        : new Date();
      baseDate.setMonth(baseDate.getMonth() + durationMonths);
      planExpiresAt = baseDate;
    }

    const updated = await dbService.updateUser(id, {
      plan,
      ...(planExpiresAt ? { planExpiresAt } : {})
    });

    await dbService.createAuditLog(
      req.userId!,
      'ADMIN_CHANGE_USER_PLAN',
      'users',
      id,
      { beforePlan: user.plan },
      { newPlan: plan, planExpiresAt, reason }
    );

    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.put('/admin/users/:id/reset-password', requireAdmin, validateBody(AdminResetPasswordSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword, reason } = req.body;

  try {
    const user = await dbService.findUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);

    await dbService.updateUser(id, { passwordHash });
    await dbService.deleteAllUserSessions(id);

    await dbService.createAuditLog(
      req.userId!,
      'ADMIN_RESET_PASSWORD',
      'users',
      id,
      null,
      { reason: reason || 'Admin manual password reset' }
    );

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.get('/admin/audit-logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await dbService.getAuditLogs(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const EXPORTABLE_COLLECTIONS = new Set([
  'users',
  'tasks',
  'projects',
  'orders',
  'payments',
  'subscriptions',
  'habits',
  'notes',
  'financeAccounts',
  'transactions',
  'budgets',
  'savingGoals'
]);

apiRouter.get('/admin/export/:collection', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { collection } = req.params;
  if (!EXPORTABLE_COLLECTIONS.has(collection)) {
    return res.status(400).json({
      success: false,
      message: `Danh mục '${collection}' không được phép xuất dữ liệu. Chỉ hỗ trợ các danh mục nghiệp vụ.`
    });
  }

  try {
    const csvContent = await dbService.exportCollectionToCSV(collection);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${collection}_export_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// TASK ATTACHMENTS (CLOUDFLARE R2 & FILE STORAGE)
// --------------------------------------------------------------------------
apiRouter.get('/tasks/:taskId/attachments', requireAuth, async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc này.' });
    }
    if (task.userId !== userId && req.userRole !== 'ADMIN' && req.userRole !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tệp của công việc này.' });
    }

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, attachments });
  } catch (err: any) {
    console.error('GET /tasks/:taskId/attachments error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/tasks/:taskId/attachments', requireAuth, async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const userId = req.userId!;
  const { fileName, fileUrl, fileSize } = req.body;
  const prisma = getPrisma();

  if (!fileName || !fileUrl) {
    return res.status(400).json({ success: false, message: 'fileName và fileUrl là bắt buộc.' });
  }

  // SEC-005 FIX: Validate fileUrl to prevent stored XSS via malicious URLs
  try {
    const parsed = new URL(String(fileUrl));
    const allowedProtocols = ['https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return res.status(400).json({ success: false, message: 'fileUrl phải dùng giao thức HTTPS.' });
    }
    // Block javascript:, data:, vbscript: and other dangerous protocols
    if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(parsed.protocol)) {
      return res.status(400).json({ success: false, message: 'fileUrl không hợp lệ.' });
    }
  } catch {
    return res.status(400).json({ success: false, message: 'fileUrl không phải URL hợp lệ.' });
  }

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc này.' });
    }
    if (task.userId !== userId && req.userRole !== 'ADMIN' && req.userRole !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thêm tệp vào công việc này.' });
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: String(fileName),
        fileUrl: String(fileUrl),
        fileSize: fileSize ? Number(fileSize) : 0
      }
    });

    res.json({ success: true, attachment, message: 'Đã đính kèm tệp vào công việc thành công!' });
  } catch (err: any) {
    console.error('POST /tasks/:taskId/attachments error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.delete('/tasks/:taskId/attachments/:attachmentId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { taskId, attachmentId } = req.params;
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc này.' });
    }
    if (task.userId !== userId && req.userRole !== 'ADMIN' && req.userRole !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tệp của công việc này.' });
    }

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    res.json({ success: true, message: 'Đã xóa tệp đính kèm thành công.' });
  } catch (err: any) {
    console.error('DELETE attachment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// WORKSPACE DATA BACKUP & RESTORE (FULL PORTABILITY)
// --------------------------------------------------------------------------
apiRouter.get('/workspace/backup/export', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true }
    });

    const [
      tasks,
      projects,
      notes,
      calendarEvents,
      scheduleBlocks,
      financeAccounts,
      transactions,
      budgets,
      savingGoals,
      debts,
      habits,
      habitLogs,
      goals,
      subjects,
      studyAssignments,
      studyExams,
      studySessions,
      decisions,
      automationRules
    ] = await Promise.all([
      prisma.task.findMany({ where: { userId }, include: { attachments: true } }),
      prisma.project.findMany({ where: { userId } }),
      prisma.note.findMany({ where: { userId } }),
      prisma.calendarEvent.findMany({ where: { userId } }),
      prisma.scheduleBlock.findMany({ where: { userId } }),
      prisma.financeAccount.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.savingGoal.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.habitLog.findMany({ where: { habit: { userId } } }),
      prisma.goal.findMany({ where: { userId }, include: { milestones: true, actions: true } }),
      prisma.subject.findMany({ where: { userId } }),
      prisma.studyAssignment.findMany({ where: { userId } }),
      prisma.studyExam.findMany({ where: { userId } }),
      prisma.studySession.findMany({ where: { userId } }),
      prisma.decision.findMany({ where: { userId } }),
      prisma.automationRule.findMany({ where: { userId } })
    ]);

    const backupPayload = {
      app: 'LifeOS',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        plan: user?.plan
      },
      stats: {
        tasksCount: tasks.length,
        projectsCount: projects.length,
        notesCount: notes.length,
        financeCount: transactions.length,
        habitsCount: habits.length,
        goalsCount: goals.length
      },
      data: {
        tasks,
        projects,
        notes,
        calendarEvents,
        scheduleBlocks,
        financeAccounts,
        transactions,
        budgets,
        savingGoals,
        debts,
        habits,
        habitLogs,
        goals,
        subjects,
        studyAssignments,
        studyExams,
        studySessions,
        decisions,
        automationRules
      }
    };

    res.json({
      success: true,
      backup: backupPayload
    });
  } catch (err: any) {
    console.error('GET /workspace/backup/export error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xuất bản sao lưu: ' + err.message });
  }
});

apiRouter.post('/workspace/backup/import', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const prisma = getPrisma();
  const { data, mode = 'merge' } = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'Dữ liệu sao lưu không đúng định dạng JSON.' });
  }

  try {
    // If replace mode, clear existing collections
    if (mode === 'replace') {
      await prisma.$transaction([
        prisma.taskAttachment.deleteMany({ where: { task: { userId } } }),
        prisma.task.deleteMany({ where: { userId } }),
        prisma.projectMilestone.deleteMany({ where: { project: { userId } } }),
        prisma.project.deleteMany({ where: { userId } }),
        prisma.note.deleteMany({ where: { userId } }),
        prisma.calendarEvent.deleteMany({ where: { userId } }),
        prisma.scheduleBlock.deleteMany({ where: { userId } }),
        prisma.transaction.deleteMany({ where: { userId } }),
        prisma.financeAccount.deleteMany({ where: { userId } }),
        prisma.budget.deleteMany({ where: { userId } }),
        prisma.savingGoal.deleteMany({ where: { userId } }),
        prisma.debt.deleteMany({ where: { userId } }),
        prisma.habitLog.deleteMany({ where: { habit: { userId } } }),
        prisma.habit.deleteMany({ where: { userId } }),
        prisma.goalMilestone.deleteMany({ where: { goal: { userId } } }),
        prisma.goalAction.deleteMany({ where: { goal: { userId } } }),
        prisma.goal.deleteMany({ where: { userId } }),
        prisma.studySession.deleteMany({ where: { userId } }),
        prisma.studyExam.deleteMany({ where: { userId } }),
        prisma.studyAssignment.deleteMany({ where: { userId } }),
        prisma.subject.deleteMany({ where: { userId } }),
        prisma.decision.deleteMany({ where: { userId } }),
        prisma.automationRule.deleteMany({ where: { userId } })
      ]);
    }

    const importedCounts: Record<string, number> = {};

    // Restore Projects
    if (Array.isArray(data.projects)) {
      let count = 0;
      for (const p of data.projects) {
        if (!p.name) continue;
        await prisma.project.create({
          data: {
            userId,
            name: p.name,
            description: p.description || null,
            status: p.status || 'Mới tạo',
            health: p.health || 'Tốt',
            progress: Number(p.progress || 0),
            startDate: p.startDate || null,
            deadline: p.deadline || null,
            budget: Number(p.budget || 0),
            color: p.color || '#3b82f6'
          }
        });
        count++;
      }
      importedCounts.projects = count;
    }

    // Restore Tasks
    if (Array.isArray(data.tasks)) {
      let count = 0;
      for (const t of data.tasks) {
        if (!t.title) continue;
        await prisma.task.create({
          data: {
            userId,
            title: t.title,
            description: t.description || null,
            status: t.status || 'Chưa làm',
            priority: t.priority || 'Trung bình',
            dueDate: t.dueDate || null,
            startDate: t.startDate || null,
            estimatedHours: Number(t.estimatedHours || 0),
            actualHours: Number(t.actualHours || 0),
            tags: typeof t.tags === 'string' ? t.tags : (Array.isArray(t.tags) ? t.tags.join(', ') : null),
            recurring: t.recurring || t.recurrence || null
          }
        });
        count++;
      }
      importedCounts.tasks = count;
    }

    // Restore Notes
    if (Array.isArray(data.notes)) {
      let count = 0;
      for (const n of data.notes) {
        if (!n.title) continue;
        await prisma.note.create({
          data: {
            userId,
            title: n.title,
            content: n.content || '',
            folder: n.folder || 'Ghi chú chung',
            category: n.category || 'Cá nhân',
            pinned: Boolean(n.pinned),
            tags: typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags || [])
          }
        });
        count++;
      }
      importedCounts.notes = count;
    }

    // Restore Habits
    if (Array.isArray(data.habits)) {
      let count = 0;
      for (const h of data.habits) {
        if (!h.name) continue;
        await prisma.habit.create({
          data: {
            userId,
            name: h.name,
            category: h.category || 'Personal',
            target: Number(h.target || 1),
            unitLabel: h.unitLabel || 'lần',
            streak: Number(h.streak || 0),
            bestStreak: Number(h.bestStreak || 0),
            status: h.status || 'Active',
            completedDates: typeof h.completedDates === 'string' ? h.completedDates : JSON.stringify(h.completedDates || [])
          }
        });
        count++;
      }
      importedCounts.habits = count;
    }

    // Restore Goals
    if (Array.isArray(data.goals)) {
      let count = 0;
      for (const g of data.goals) {
        if (!g.title) continue;
        await prisma.goal.create({
          data: {
            userId,
            title: g.title,
            category: g.category || 'Personal',
            progress: Number(g.progress || 0),
            status: g.status || 'In Progress',
            targetValue: Number(g.targetValue || 100),
            currentValue: Number(g.currentValue || 0),
            deadline: g.deadline || null,
            tier: g.tier || 'Tier 1'
          }
        });
        count++;
      }
      importedCounts.goals = count;
    }

    // Restore Finance Accounts & Transactions
    if (Array.isArray(data.financeAccounts)) {
      let count = 0;
      for (const a of data.financeAccounts) {
        if (!a.name) continue;
        await prisma.financeAccount.create({
          data: {
            userId,
            name: a.name,
            type: a.type || 'Tiền mặt',
            balance: Number(a.balance || 0),
            currency: a.currency || 'VND',
            color: a.color || '#10b981'
          }
        });
        count++;
      }
      importedCounts.financeAccounts = count;
    }

    await dbService.createAuditLog(
      userId,
      'USER_IMPORT_WORKSPACE_BACKUP',
      'workspace',
      userId,
      null,
      { mode, importedCounts }
    );

    res.json({
      success: true,
      message: 'Nhập dữ liệu sao lưu thành công!',
      importedCounts
    });
  } catch (err: any) {
    console.error('POST /workspace/backup/import error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi nhập dữ liệu sao lưu: ' + err.message });
  }
});

// ==========================================
// ADMIN GMAIL & NOTIFICATION SYSTEM ROUTES
// ==========================================

// 1. Get current Gmail configuration (App password masked for security)
apiRouter.get('/admin/gmail/config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const config = await gmailService.getConfig();
    // Mask sensitive app password
    const safeConfig = {
      ...config,
      appPassword: config.appPassword ? '••••••••••••••••' : ''
    };
    res.json({
      success: true,
      config: safeConfig
    });
  } catch (err: any) {
    console.error('GET /admin/gmail/config error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tải cấu hình Gmail: ' + err.message });
  }
});

// 2. Update Gmail configuration
apiRouter.put('/admin/gmail/config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body || {};
    const updated = await gmailService.saveConfig(payload, req.userId);

    await dbService.createAuditLog(
      req.userId!,
      'ADMIN_UPDATE_GMAIL_CONFIG',
      'system_settings',
      'gmail_notification_config',
      null,
      { enabled: updated.enabled, user: updated.user, fromName: updated.fromName }
    );

    res.json({
      success: true,
      message: 'Cập nhật cấu hình Gmail thành công!',
      config: {
        ...updated,
        appPassword: updated.appPassword ? '••••••••••••••••' : ''
      }
    });
  } catch (err: any) {
    console.error('PUT /admin/gmail/config error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu cấu hình Gmail: ' + err.message });
  }
});

// 3. Test Gmail connection & send test email
apiRouter.post('/admin/gmail/test', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { testEmail } = req.body;
    const recipient = testEmail || req.user.email;
    const result = await gmailService.testConnection(recipient);

    res.json(result);
  } catch (err: any) {
    console.error('POST /admin/gmail/test error:', err);
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra kết nối: ' + err.message });
  }
});

// 4. Get recent notification logs (live monitor)
apiRouter.get('/admin/gmail/logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = gmailService.getNotificationLogs();
    res.json({
      success: true,
      logs
    });
  } catch (err: any) {
    console.error('GET /admin/gmail/logs error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải nhật ký gửi email: ' + err.message });
  }
});

// ====================================================
// REFERRAL PROGRAM API ENDPOINTS
// ====================================================

// 1. User: Get Referral Dashboard Stats
apiRouter.get('/referrals/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const data = await referralService.getUserDashboard(req.userId!, origin);
    res.json({
      success: true,
      ...data
    });
  } catch (err: any) {
    console.error('GET /referrals/dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. User: Request Withdrawal to Bank
apiRouter.post('/referrals/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, bankName, bankAccount, accountHolder, transferNote, userNote } = req.body;
    const request = await referralService.requestWithdrawal(req.userId!, {
      amount: Number(amount),
      bankName,
      bankAccount,
      accountHolder,
      transferNote,
      userNote
    });
    res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu rút tiền thành công! Admin sẽ duyệt và giải ngân sớm.',
      request
    });
  } catch (err: any) {
    console.error('POST /referrals/withdraw error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. User: Get withdrawal history
apiRouter.get('/referrals/withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const list = await referralService.getUserWithdrawals(req.userId!);
    res.json({
      success: true,
      withdrawals: list
    });
  } catch (err: any) {
    console.error('GET /referrals/withdrawals error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Admin: Get Global Referral Overview
apiRouter.get('/admin/referrals/overview', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = await referralService.getAdminOverview();
    res.json({
      success: true,
      ...data
    });
  } catch (err: any) {
    console.error('GET /admin/referrals/overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Admin: List all withdrawal requests
apiRouter.get('/admin/referrals/withdrawals', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const list = await referralService.getAdminWithdrawals(status ? String(status) : undefined);
    res.json({
      success: true,
      withdrawals: list
    });
  } catch (err: any) {
    console.error('GET /admin/referrals/withdrawals error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Admin: Approve withdrawal request (mark PAID, provide txReference)
apiRouter.post('/admin/referrals/withdrawals/:id/approve', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { txReference, proofUrl } = req.body;
    const adminEmail = req.user.email;
    const result = await referralService.adminApproveWithdrawal(req.params.id, adminEmail, txReference, proofUrl);
    res.json({
      success: true,
      message: 'Đã duyệt yêu cầu rút tiền và đánh dấu Đã chuyển khoản!',
      withdrawal: result
    });
  } catch (err: any) {
    console.error('POST /admin/referrals/withdrawals/:id/approve error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 7. Admin: Reject withdrawal request (refunds funds back to available balance)
apiRouter.post('/admin/referrals/withdrawals/:id/reject', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, message: 'Bắt buộc nhập lý do từ chối yêu cầu rút tiền.' });
      return;
    }
    const adminEmail = req.user.email;
    const result = await referralService.adminRejectWithdrawal(req.params.id, adminEmail, String(reason).trim());
    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu rút tiền và hoàn lại toàn bộ số tiền vào ví người dùng!',
      withdrawal: result
    });
  } catch (err: any) {
    console.error('POST /admin/referrals/withdrawals/:id/reject error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ====================================================
// FEEDBACK & FEATURE REQUEST API ENDPOINTS
// ====================================================

// 1. User: Submit new feedback
apiRouter.post('/feedback', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, rating } = req.body;
    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Tiêu đề và nội dung góp ý là bắt buộc.' });
      return;
    }
    const feedback = await feedbackService.createFeedback(req.userId!, {
      title,
      content,
      type,
      rating
    });
    res.status(201).json({
      success: true,
      message: 'Gửi góp ý thành công! Cảm ơn bạn đã đóng góp.',
      feedback
    });
  } catch (err: any) {
    console.error('POST /feedback error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. User: Get own feedbacks
apiRouter.get('/feedback/my', async (req: AuthRequest, res: Response) => {
  try {
    const list = await feedbackService.getUserFeedbacks(req.userId!);
    res.json({
      success: true,
      feedbacks: list
    });
  } catch (err: any) {
    console.error('GET /feedback/my error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. User & Public: Get community feedback wishlist & roadmap
apiRouter.get('/feedback/public', async (req: AuthRequest, res: Response) => {
  try {
    const list = await feedbackService.getPublicFeedbacks(req.userId);
    res.json({
      success: true,
      feedbacks: list
    });
  } catch (err: any) {
    console.error('GET /feedback/public error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. User: Upvote / Vote on community feedback
apiRouter.post('/feedback/:id/vote', async (req: AuthRequest, res: Response) => {
  try {
    const result = await feedbackService.toggleVote(req.userId!, req.params.id);
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('POST /feedback/:id/vote error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Admin: List feedbacks with filter, search & counts
apiRouter.get('/admin/feedback', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, search, isImportant } = req.query;
    const data = await feedbackService.getAdminFeedbacks({
      status: status ? String(status) : undefined,
      type: type ? String(type) : undefined,
      search: search ? String(search) : undefined,
      isImportant: isImportant !== undefined ? isImportant === 'true' : undefined
    });
    res.json({
      success: true,
      ...data
    });
  } catch (err: any) {
    console.error('GET /admin/feedback error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Admin: Update status, write reply, toggle important flag
apiRouter.patch('/admin/feedback/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminReply, isImportant } = req.body;
    const updated = await feedbackService.adminUpdateFeedback(
      req.params.id,
      req.userId!,
      req.user.email,
      {
        status,
        adminReply,
        isImportant
      }
    );
    res.json({
      success: true,
      message: 'Cập nhật trạng thái góp ý thành công!',
      feedback: updated
    });
  } catch (err: any) {
    console.error('PATCH /admin/feedback/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

