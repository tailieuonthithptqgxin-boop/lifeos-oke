import { getPrisma } from '../db.js';
import { gmailService, getAppBaseUrl } from './gmailNotification.service.js';
import { emailQueueService } from './emailQueue.service.js';
import { buildEmailHtml } from './emailTemplate.service.js';

export interface PlanDefinition {
  id: string;
  name: string;
  type: 'PERSONAL' | 'TEAM';
  durationDays: number;
  price: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  billingCycle: string;
  badge?: string;
  description: string;
  features: string[];
  quota?: string;
  maxTeamMembers?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  order?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const OFFICIAL_PLANS: PlanDefinition[] = [
  {
    id: 'PERSONAL_1M',
    name: 'Gói Cá Nhân (1 Tháng)',
    type: 'PERSONAL',
    durationDays: 30,
    price: 29000,
    monthlyPrice: 29000,
    yearlyPrice: 0,
    billingCycle: '1 tháng (30 ngày)',
    badge: 'Tiết kiệm',
    description: 'Mở khóa toàn bộ chức năng LifeOS trong 1 tháng (30 ngày). Bắt buộc có gói trả phí để truy cập hệ thống.',
    order: 1,
    status: 'ACTIVE',
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
    price: 79000,
    monthlyPrice: 79000,
    yearlyPrice: 0,
    billingCycle: '3 tháng (90 ngày)',
    badge: 'Phổ biến nhất',
    description: 'Mở khóa toàn bộ tính năng trong 3 tháng liên tục với chi phí tiết kiệm hơn.',
    order: 2,
    status: 'ACTIVE',
    features: [
      'Bao gồm toàn bộ quyền lợi của Gói Cá Nhân 1 Tháng',
      'Thời hạn sử dụng 90 ngày liên tục',
      'Tiết kiệm 8.000 VNĐ so với gia hạn từng tháng',
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
    price: 99000,
    monthlyPrice: 99000,
    yearlyPrice: 0,
    billingCycle: '1 tháng (30 ngày)',
    badge: 'Dành cho Đội ngũ',
    maxTeamMembers: 5,
    description: 'Dành cho đội ngũ cộng tác. Chủ team được mời thêm tối đa 5 người dùng cùng sử dụng đầy đủ chức năng.',
    order: 3,
    status: 'ACTIVE',
    features: [
      'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
      'Cho phép Chủ Team thêm tối đa 5 người dùng vào Team',
      'Tất cả thành viên trong Team được hưởng toàn bộ tính năng trả phí',
      'Chủ Team có toàn quyền quản trị, thêm/xóa thành viên linh hoạt',
      'Tự động đồng bộ quyền hạn khi gói Team còn hạn'
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
    order: 4,
    status: 'ACTIVE',
    features: [
      'Toàn bộ tính năng Quản lý Công việc & Dự án (Kanban, Lịch, Bộ lọc)',
      'Quản lý Tài chính, Ví tiền, Ngân sách và Báo cáo thu chi',
      'Theo dõi Thói quen, Chuỗi streak và Mục tiêu cuộc sống',
      'Decision Engine & Mô phỏng kịch bản What-if',
      'Automation Rules Engine kích hoạt tự động',
      'Không gian Học tập, Pomodoro Focus và Ghi chú không giới hạn'
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
    billingCycle: '30 ngày',
    badge: 'Dành cho Đội ngũ',
    maxTeamMembers: 5,
    description: 'Dành cho doanh nghiệp và đội ngũ cộng tác không giới hạn.',
    order: 5,
    status: 'ACTIVE',
    features: [
      'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
      'Cho phép Chủ Team thêm tối đa 5 người dùng vào Team'
    ],
    quota: 'Tối đa 5 thành viên / nhóm'
  }
];

export type AccountLifecycleStatus = 'UNPAID' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'DISABLED';

export interface UserSubscriptionStatus {
  hasAccess: boolean;
  lifecycleStatus: AccountLifecycleStatus;
  planId: string;
  planType: 'PERSONAL' | 'TEAM' | 'NONE';
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'NONE';
  amount?: number;
  startDate?: string;
  endDate?: string;
  remainingDays: number;
  isTeamOwner?: boolean;
  isTeamMember?: boolean;
  teamId?: string;
  teamName?: string;
  teamOwnerEmail?: string;
  subscriptionId?: string;
  role?: string;
  activePending?: any;
  isGlobalFreeMode?: boolean;
  isTrial?: boolean;
  isTrialActive?: boolean;
  isTrialExpired?: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  remainingHours?: number;
}

export const subscriptionService = {
  /**
   * Authoritative Single Source of Truth for Service Plans.
   * Dynamically loads from DB SystemSetting ('service_plans_config'),
   * ensuring Admin pricing and feature updates are immediately reflected everywhere.
   */
  async getPlans(includeInactive: boolean = false): Promise<PlanDefinition[]> {
    try {
      const prisma = getPrisma();
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'service_plans_config' }
      });

      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((p: any, idx: number): PlanDefinition => {
            const id = String(p.id).toUpperCase();
            const isTeam = id.includes('TEAM') || p.type === 'TEAM';
            const durationDays = Number(p.durationDays) || (id === 'PERSONAL_3M' ? 90 : 30);
            const price = Number(p.monthlyPrice !== undefined ? p.monthlyPrice : (p.price ?? 0));
            const yearlyPrice = Number(p.yearlyPrice ?? 0);
            return {
              id: p.id,
              name: p.name || id,
              type: isTeam ? 'TEAM' : 'PERSONAL',
              durationDays,
              price,
              monthlyPrice: price,
              yearlyPrice,
              billingCycle: p.billingCycle || (durationDays === 90 ? '3 tháng (90 ngày)' : '1 tháng (30 ngày)'),
              badge: p.badge || (isTeam ? 'Dành cho Đội ngũ' : (durationDays === 90 ? 'Phổ biến nhất' : 'Tiết kiệm')),
              description: p.description || '',
              features: Array.isArray(p.features) ? p.features : [],
              quota: p.quota || (isTeam ? 'Tối đa 5 thành viên' : '1 người dùng'),
              maxTeamMembers: isTeam ? (p.maxTeamMembers || 5) : 0,
              status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              order: Number(p.order ?? idx + 1),
              updatedAt: p.updatedAt,
              updatedBy: p.updatedBy
            };
          });

          const filtered = includeInactive ? mapped : mapped.filter(p => p.status === 'ACTIVE');
          return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      }
    } catch (err) {
      console.warn('[subscriptionService] Could not read service_plans_config from DB:', err);
    }

    const filteredDefaults = includeInactive ? OFFICIAL_PLANS : OFFICIAL_PLANS.filter(p => p.status !== 'INACTIVE');
    return filteredDefaults.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  /**
   * Synchronous fallback getter for backward-compatibility with tests / offline initialization
   */
  getPlansSync(): PlanDefinition[] {
    return OFFICIAL_PLANS;
  },

  /**
   * Retrieve authoritative plan configuration by ID
   */
  async getPlanById(planId: string): Promise<PlanDefinition | undefined> {
    const cleanId = String(planId || '').toUpperCase().trim();
    const allPlans = await this.getPlans(true);
    let found = allPlans.find(p => p.id.toUpperCase() === cleanId);
    if (!found) {
      if (cleanId === 'PRO') found = allPlans.find(p => p.id === 'PERSONAL_1M' || p.id === 'PRO');
      if (cleanId === 'TEAM') found = allPlans.find(p => p.id === 'TEAM_1M' || p.id === 'TEAM');
    }
    return found;
  },

  /**
   * Check whether Global Free Trial Mode is activated across the whole system.
   * Persisted in PostgreSQL database (system_settings table).
   */
  async isGlobalFreeMode(): Promise<boolean> {
    const prisma = getPrisma();
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'global_free_mode' }
      });
      return setting?.value === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Toggle Global Free Trial Mode ON/OFF.
   * Persisted in PostgreSQL database, logs audit trail, and automatically dispatches
   * guaranteed security email notification to Admin via persistent Outbox Queue.
   */
  async setGlobalFreeMode(enabled: boolean, adminUser: { id: string; name: string; email: string; ip?: string }): Promise<{ enabled: boolean; updatedAt: Date }> {
    const prisma = getPrisma();
    const strVal = enabled ? 'true' : 'false';
    const now = new Date();

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'global_free_mode' },
      update: { value: strVal, updatedAt: now },
      create: { key: 'global_free_mode', value: strVal, updatedAt: now }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'TOGGLE_GLOBAL_FREE_MODE',
        beforeState: null,
        afterState: JSON.stringify({ enabled, updatedAt: now }),
        result: 'Success',
        reason: `Admin ${adminUser.name} (${adminUser.email}) đã ${enabled ? 'BẬT' : 'TẮT'} chế độ Dùng thử Free toàn hệ thống.`
      }
    });

    // Guaranteed security email alert to Admin via Outbox Queue
    const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.INITIAL_ADMIN_EMAIL || adminUser.email;
    const emailHtml = buildEmailHtml({
      headline: `CẢNH BÁO BẢO MẬT: Chế độ Dùng Thử Miễn Phí Toàn Hệ Thống đã được ${enabled ? 'BẬT' : 'TẮT'}`,
      previewText: `Chế độ Dùng thử Free toàn hệ thống đã thay đổi thành: ${enabled ? 'BẬT (Mở khóa 100%)' : 'TẮT (Khóa với user chưa mua)'}`,
      priority: 'CRITICAL',
      badgeText: enabled ? 'FREE TRIAL MODE ACTIVATED' : 'FREE TRIAL MODE DEACTIVATED',
      greeting: `Kính gửi Ban Quản Trị LifeOS,`,
      paragraphs: [
        `Công tắc <strong>"Cho phép tất cả mọi người dùng thử miễn phí toàn bộ tính năng"</strong> vừa được thay đổi trạng thái trong trang Quản trị.`,
        enabled
          ? `⚠️ <strong>Trạng thái hiện tại: ĐANG BẬT</strong>. Tất cả người dùng (kể cả chưa mua gói) đều có quyền truy cập 100% tính năng của hệ thống. Dữ liệu gói của những khách hàng đã mua trước đó vẫn được bảo toàn nguyên vẹn.`
          : `🔒 <strong>Trạng thái hiện tại: ĐANG TẮT</strong>. Hệ thống đã khóa lại quyền truy cập đối với các tài khoản chưa mua gói trả phí. Những khách hàng đã mua gói hợp lệ vẫn tiếp tục sử dụng bình thường.`
      ],
      detailsTable: [
        { label: 'Trạng thái mới', value: enabled ? 'BẬT (Cho phép dùng thử FREE)' : 'TẮT (Bắt buộc mua gói)' },
        { label: 'Người thực hiện', value: `${adminUser.name} (${adminUser.email})` },
        { label: 'Địa chỉ IP', value: adminUser.ip || 'Local / Internal' },
        { label: 'Thời gian áp dụng', value: now.toLocaleString('vi-VN') }
      ],
      ctaButton: {
        label: 'Mở Trang Quản Trị Hệ Thống',
        url: (process.env.APP_URL || 'http://localhost:3000') + '/admin'
      },
      footerNote: 'Đây là thông báo an ninh quan trọng được gửi tự động từ LifeOS Security Center khi cấu hình hệ thống thay đổi.'
    });

    await emailQueueService.enqueue({
      recipient: adminNotificationEmail,
      subject: `[LifeOS Security] Cảnh báo: Công tắc Dùng thử Free toàn hệ thống đã được ${enabled ? 'BẬT' : 'TẮT'}`,
      htmlBody: emailHtml,
      eventType: 'SECURITY_ALERT',
      metadata: { adminId: adminUser.id, action: 'TOGGLE_GLOBAL_FREE_MODE', enabled }
    });

    return { enabled, updatedAt: setting.updatedAt };
  },

  /**
   * Zero-Trust Subscription Verification & Lazy Expiration Enforcement
   * 1. Checks current database state without relying on client localStorage or cookies.
   * 2. Automatically updates expired subscriptions to EXPIRED in the database upon check.
   * 3. Blocks expired accounts immediately, keeping access restricted to billing/renewal.
   */
  async checkUserSubscription(userId: string): Promise<UserSubscriptionStatus> {
    const prisma = getPrisma();
    const now = new Date();

    // 1. Fetch user model and core role/status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        planExpiresAt: true,
        status: true,
        trialStartedAt: true,
        trialEndsAt: true,
        trialUsed: true
      }
    });

    if (!user) {
      return {
        hasAccess: false,
        lifecycleStatus: 'UNPAID',
        planId: 'NONE',
        planType: 'NONE',
        planName: 'Không xác định',
        status: 'NONE',
        remainingDays: 0
      };
    }

    // Suspended or Disabled user accounts have 0 access
    if (user.status === 'DISABLED') {
      return {
        hasAccess: false,
        lifecycleStatus: 'DISABLED',
        planId: 'DISABLED',
        planType: 'NONE',
        planName: 'Tài khoản vô hiệu hóa',
        status: 'NONE',
        remainingDays: 0,
        role: user.role
      };
    }

    if (user.status === 'SUSPENDED') {
      return {
        hasAccess: false,
        lifecycleStatus: 'SUSPENDED',
        planId: 'SUSPENDED',
        planType: 'NONE',
        planName: 'Tài khoản tạm khóa',
        status: 'NONE',
        remainingDays: 0,
        role: user.role
      };
    }

    // System Admins always have full operational access
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return {
        hasAccess: true,
        lifecycleStatus: 'ACTIVE',
        planId: 'ADMIN',
        planType: 'TEAM',
        planName: 'Quản trị viên Hệ thống',
        status: 'ACTIVE',
        remainingDays: 9999,
        role: user.role
      };
    }

    // Check if there is an active pending payment awaiting approval
    const activePending = await prisma.payment.findFirst({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });

    // Check if Global Free Mode is currently activated in system settings
    const isFreeMode = await this.isGlobalFreeMode();
    if (isFreeMode) {
      return {
        hasAccess: true,
        lifecycleStatus: 'ACTIVE',
        planId: user.plan === 'FREE' ? 'FREE_TRIAL_GLOBAL' : user.plan,
        planType: user.plan?.includes('TEAM') ? 'TEAM' : 'PERSONAL',
        planName: user.plan === 'FREE' ? 'Dùng thử Toàn Hệ thống (Admin Open)' : (user.plan || 'Gói Cá Nhân'),
        status: 'ACTIVE',
        remainingDays: 365,
        isGlobalFreeMode: true,
        role: user.role,
        activePending: activePending || null
      };
    }

    // 2. LAZY EXPIRATION AUDIT: Sweep any subscriptions that passed their endDate
    const expiredActiveSubs = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { lte: now }
      }
    });

    if (expiredActiveSubs.length > 0) {
      await prisma.subscription.updateMany({
        where: { id: { in: expiredActiveSubs.map(s => s.id) } },
        data: { status: 'EXPIRED' }
      });

      const remainingActiveSub = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: { gt: now }
        }
      });

      if (!remainingActiveSub) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: 'FREE', planExpiresAt: null }
        });
        user.plan = 'FREE';
        user.planExpiresAt = null;
      }
    }

    // 3. Check for valid direct personal or team-owner active subscription
    const directSub = await prisma.subscription.findFirst({
      where: {
        userId,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
        endDate: { gt: now }
      },
      orderBy: { endDate: 'desc' },
      include: {
        team: true
      }
    });

    if (directSub) {
      const remainingDays = Math.max(0, Math.ceil((new Date(directSub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        hasAccess: true,
        lifecycleStatus: 'ACTIVE',
        planId: directSub.planId,
        planType: (directSub.planType as any) || (directSub.planId.includes('TEAM') ? 'TEAM' : 'PERSONAL'),
        planName: directSub.planName,
        status: 'ACTIVE',
        amount: directSub.amount,
        startDate: directSub.startDate.toISOString(),
        endDate: directSub.endDate.toISOString(),
        remainingDays,
        isTeamOwner: directSub.planType === 'TEAM' || directSub.planId.includes('TEAM'),
        isTeamMember: false,
        teamId: directSub.team?.id,
        teamName: directSub.team?.name,
        subscriptionId: directSub.id,
        activePending: activePending || null
      };
    }

    // 4. Check if user is a member of an active Team
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      include: {
        team: {
          include: {
            owner: { select: { id: true, email: true, name: true } },
            subscription: true
          }
        }
      }
    });

    if (membership && membership.team) {
      const team = membership.team;
      const teamSub = team.subscription;

      if (
        teamSub &&
        teamSub.status === 'ACTIVE' &&
        teamSub.paymentStatus === 'PAID' &&
        new Date(teamSub.endDate).getTime() > now.getTime()
      ) {
        const remainingDays = Math.max(0, Math.ceil((new Date(teamSub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          hasAccess: true,
          lifecycleStatus: 'ACTIVE',
          planId: teamSub.planId,
          planType: 'TEAM',
          planName: `${teamSub.planName} (Thành viên nhóm)`,
          status: 'ACTIVE',
          amount: teamSub.amount,
          startDate: teamSub.startDate.toISOString(),
          endDate: teamSub.endDate.toISOString(),
          remainingDays,
          isTeamOwner: false,
          isTeamMember: true,
          teamId: team.id,
          teamName: team.name,
          teamOwnerEmail: team.owner.email,
          subscriptionId: teamSub.id,
          activePending: activePending || null
        };
      }
    }

    // 5. Fallback for standalone manual grant on User model (only if no subscriptions table entries exist)
    const anySubRecord = await prisma.subscription.findFirst({ where: { userId } });
    if (!anySubRecord && user.plan && user.plan !== 'FREE') {
      if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() > now.getTime()) {
        const remainingDays = Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          hasAccess: true,
          lifecycleStatus: 'ACTIVE',
          planId: user.plan,
          planType: user.plan === 'TEAM' ? 'TEAM' : 'PERSONAL',
          planName: user.plan === 'TEAM' ? 'Gói Đội Ngũ' : 'Gói Pro Cá Nhân',
          status: 'ACTIVE',
          remainingDays,
          role: user.role,
          activePending: activePending || null
        };
      } else {
        // Expired on User model -> Downgrade immediately
        await prisma.user.update({
          where: { id: userId },
          data: { plan: 'FREE', planExpiresAt: null }
        });
      }
    } else if (anySubRecord && user.plan !== 'FREE') {
      // User has subscriptions in table, but none are active -> Downgrade user model to FREE
      await prisma.user.update({
        where: { id: userId },
        data: { plan: 'FREE', planExpiresAt: null }
      });
      user.plan = 'FREE';
      user.planExpiresAt = null;
    }

    // 6. Check 7-Day Free Trial Entitlement (for newly registered accounts)
    if (user.trialEndsAt) {
      const trialEndMs = new Date(user.trialEndsAt).getTime();
      const nowMs = now.getTime();

      if (trialEndMs > nowMs) {
        // Active 7-Day Free Trial
        const remainingDiff = trialEndMs - nowMs;
        const remainingDays = Math.max(1, Math.ceil(remainingDiff / (1000 * 60 * 60 * 24)));
        const remainingHours = Math.max(0, Math.ceil(remainingDiff / (1000 * 60 * 60)));

        return {
          hasAccess: true,
          lifecycleStatus: 'ACTIVE',
          planId: 'FREE_TRIAL_7D',
          planType: 'PERSONAL',
          planName: 'Dùng thử 7 Ngày Miễn Phí',
          status: 'ACTIVE',
          isTrial: true,
          isTrialActive: true,
          isTrialExpired: false,
          trialStartedAt: user.trialStartedAt?.toISOString(),
          trialEndsAt: user.trialEndsAt.toISOString(),
          startDate: user.trialStartedAt?.toISOString() || now.toISOString(),
          endDate: user.trialEndsAt.toISOString(),
          remainingDays,
          remainingHours,
          role: user.role,
          activePending: activePending || null
        };
      } else {
        // 7-Day Free Trial Expired
        return {
          hasAccess: false,
          lifecycleStatus: activePending ? 'PENDING' : 'EXPIRED',
          planId: 'FREE_TRIAL_7D',
          planType: 'PERSONAL',
          planName: 'Dùng thử 7 ngày đã kết thúc',
          status: 'EXPIRED',
          isTrial: true,
          isTrialActive: false,
          isTrialExpired: true,
          trialStartedAt: user.trialStartedAt?.toISOString(),
          trialEndsAt: user.trialEndsAt.toISOString(),
          startDate: user.trialStartedAt?.toISOString(),
          endDate: user.trialEndsAt.toISOString(),
          remainingDays: 0,
          remainingHours: 0,
          role: user.role,
          activePending: activePending || null
        };
      }
    }

    // 7. Check historical latest subscription for explicit EXPIRED status display
    const latestSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { endDate: 'desc' }
    });

    if (latestSub) {
      return {
        hasAccess: false,
        lifecycleStatus: activePending ? 'PENDING' : (latestSub.status === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED'),
        planId: latestSub.planId,
        planType: (latestSub.planType as any) || 'PERSONAL',
        planName: latestSub.planName,
        status: (latestSub.status as any) || 'EXPIRED',
        amount: latestSub.amount,
        startDate: latestSub.startDate.toISOString(),
        endDate: latestSub.endDate.toISOString(),
        remainingDays: 0,
        subscriptionId: latestSub.id,
        activePending: activePending || null
      };
    }

    // 8. No subscription found -> PENDING if payment request exists, else UNPAID
    return {
      hasAccess: false,
      lifecycleStatus: activePending ? 'PENDING' : 'UNPAID',
      planId: 'NONE',
      planType: 'NONE',
      planName: 'Chưa kích hoạt gói',
      status: 'NONE',
      remainingDays: 0,
      activePending: activePending || null
    };
  },

  /**
   * Activate or Extend a Subscription with:
   * 1. Exact 30-day / 90-day calculation on backend.
   * 2. Price snapshotting (preserves historical purchase price even if admin updates prices later).
   * 3. Stacking renewal: If user already has active days remaining, new duration is appended
   *    seamlessly to current endDate (no days lost).
   */
  async activateSubscription(
    userId: string,
    planId: string,
    paymentInfo?: {
      txReference?: string;
      paymentId?: string;
      customDurationDays?: number;
      amount?: number;
    }
  ): Promise<any> {
    const prisma = getPrisma();
    const now = new Date();

    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error(`Gói dịch vụ '${planId}' không tồn tại. Không thể kích hoạt.`);
    }

    // Idempotency: one payment can only ever produce one subscription
    if (paymentInfo?.paymentId) {
      const already = await prisma.subscription.findFirst({ where: { paymentId: paymentInfo.paymentId } });
      if (already) return already;
    }

    const durationDays = paymentInfo?.customDurationDays ?? plan.durationDays;
    if (!Number.isFinite(durationDays) || durationDays <= 0 || durationDays > 3660) {
      throw new Error(`Thời hạn gói không hợp lệ: ${durationDays}`);
    }
    const snapshotAmount = paymentInfo?.amount !== undefined ? paymentInfo.amount : plan.price;

    // Check if user currently has an active subscription to STACK / EXTEND
    const existingActive = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        endDate: { gt: now }
      },
      orderBy: { endDate: 'desc' }
    });

    // Stacking calculation: base date is current endDate if valid and in future, otherwise now
    const baseDate = existingActive ? new Date(existingActive.endDate) : now;
    const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // If an existing subscription was extended, supersede it to maintain one primary active record
    if (existingActive) {
      await prisma.subscription.update({
        where: { id: existingActive.id },
        data: { status: 'CANCELLED' }
      });
    }

    // Also cancel any other leftover ACTIVE subscriptions for this user
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });

    // Create the authoritative subscription record with snapshot price and exact endDate
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        planType: plan.type,
        planName: plan.name,
        amount: snapshotAmount, // Historic snapshot price preserved
        billingCycle: plan.billingCycle,
        durationDays,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
        txReference: paymentInfo?.txReference || `ACT_${Date.now()}`,
        paymentId: paymentInfo?.paymentId || null,
        startDate: now,
        endDate,
        purchasedAt: now
      }
    });

    // Sync user model plan and expiration date
    const mappedUserPlan = plan.type === 'TEAM' ? 'TEAM' : 'PRO';
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: mappedUserPlan as any,
        planExpiresAt: endDate
      }
    });

    // If Team plan, ensure Team entity exists for this user and is linked
    if (plan.type === 'TEAM') {
      const existingTeam = await prisma.team.findFirst({ where: { ownerId: userId } });
      if (existingTeam) {
        await prisma.team.update({
          where: { id: existingTeam.id },
          data: {
            subscriptionId: subscription.id,
            maxMembers: plan.maxTeamMembers || 5
          }
        });
      } else {
        await prisma.team.create({
          data: {
            name: 'Nhóm làm việc của tôi',
            ownerId: userId,
            subscriptionId: subscription.id,
            maxMembers: plan.maxTeamMembers || 5
          }
        });
      }
    }

    return subscription;
  },

  /**
   * Process Refund & Subscription Revocation (Requirement 9 & 10)
   * When an order/payment is refunded:
   * 1. Payment status set to REFUNDED.
   * 2. Order status set to REFUNDED.
   * 3. Linked subscription status set to CANCELLED and expired immediately.
   * 4. User reverted to FREE plan.
   * 5. Referral commissions cancelled/rolled back.
   */
  async cancelSubscriptionOnRefund(paymentId: string, reason?: string, adminEmail?: string) {
    const prisma = getPrisma();
    const now = new Date();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) {
      throw new Error('Không tìm thấy yêu cầu thanh toán cần hoàn tiền.');
    }

    if (payment.status === 'REFUNDED') {
      return { payment, message: 'Thanh toán này đã được hoàn tiền trước đó.' };
    }

    // 1. Update Payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        rejectedReason: `Đã hoàn tiền: ${reason || 'Theo chính sách hoàn tiền'} (Bởi ${adminEmail || 'Quản trị viên'})`,
        updatedAt: now
      }
    });

    // 2. Update Order status
    await prisma.order.updateMany({
      where: { orderId: payment.orderId },
      data: { status: 'REFUNDED' }
    });

    // 3. Revoke subscriptions linked to this payment or active for user
    await prisma.subscription.updateMany({
      where: {
        userId: payment.userId,
        OR: [
          { paymentId: payment.id },
          { txReference: payment.txReference },
          { status: 'ACTIVE' }
        ]
      },
      data: {
        status: 'CANCELLED',
        endDate: now
      }
    });

    // 4. Revert User to FREE
    const updatedUser = await prisma.user.update({
      where: { id: payment.userId },
      data: {
        plan: 'FREE',
        planExpiresAt: null
      },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true }
    });

    // 5. Rollback Referral Commission
    try {
      const { referralService } = await import('./referral.service.js');
      await referralService.processOrderCancelledOrRefunded(payment.orderId, `Hoàn tiền: ${reason || 'Admin hoàn tiền'}`);
    } catch (refErr) {
      console.warn('[Referral] Rollback commission on refund error:', refErr);
    }

    // 6. Notify customer
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: 'Đơn hàng đã được hoàn tiền & Gói dịch vụ đã thu hồi',
        message: `Đơn thanh toán ${payment.txReference} đã được hoàn tiền (${(payment.amount || 0).toLocaleString('vi-VN')} ₫). Quyền sử dụng gói ${payment.planRequested} đã kết thúc. Lý do: ${reason || 'Theo yêu cầu hoàn tiền'}.`,
        type: 'Warning',
        read: false
      }
    });

    return { payment: updatedPayment, user: updatedUser };
  },

  /**
   * Background Worker Expiration Sweep (Requirement 5 & 6)
   * Sweeps all overdue ACTIVE subscriptions and marks them EXPIRED in the database.
   */
  async expireOverdueSubscriptions(): Promise<{ expiredCount: number }> {
    const prisma = getPrisma();
    const now = new Date();

    const overdueSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: now }
      },
      include: { user: { select: { id: true, email: true, name: true, plan: true } } }
    });

    if (overdueSubs.length === 0) return { expiredCount: 0 };

    const overdueIds = overdueSubs.map(s => s.id);
    await prisma.subscription.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: 'EXPIRED' }
    });

    for (const sub of overdueSubs) {
      // Check if user has any remaining active subscription
      const remainingActive = await prisma.subscription.findFirst({
        where: {
          userId: sub.userId,
          status: 'ACTIVE',
          endDate: { gt: now }
        }
      });

      if (!remainingActive) {
        await prisma.user.update({
          where: { id: sub.userId },
          data: { plan: 'FREE', planExpiresAt: null }
        });

        // Notify in-app
        try {
          await prisma.notification.create({
            data: {
              userId: sub.userId,
              title: 'Gói đăng ký đã hết hạn',
              message: `Gói ${sub.planName} của bạn đã hết hạn vào ngày ${new Date(sub.endDate).toLocaleDateString('vi-VN')}. Quyền truy cập các tính năng nâng cao đã tạm khóa. Vui lòng gia hạn để tiếp tục sử dụng.`,
              type: 'Warning',
              read: false
            }
          });
        } catch (e) {}

        // Send email notification
        if (sub.user?.email) {
          gmailService.sendNotification({
            to: sub.user.email,
            recipientName: sub.user.name || 'Quý khách',
            subject: `⏳ [Life OS] Gói đăng ký ${sub.planName} của bạn đã hết hạn`,
            category: 'SUBSCRIPTION',
            headline: 'Gói dịch vụ đã kết thúc chu kỳ',
            content: `Gói tài khoản <strong>${sub.planName}</strong> của bạn đã hết thời hạn sử dụng. Tài khoản hiện đã được chuyển về gói <strong>Miễn phí (FREE)</strong>.<br/><br/>Để tiếp tục sử dụng đầy đủ các tính năng thông minh không giới hạn, bạn vui lòng gia hạn hoặc nâng cấp gói mới.`,
            actionLabel: 'Gia hạn gói dịch vụ',
            actionUrl: getAppBaseUrl(),
            badgeText: 'Hết hạn gói',
            badgeColor: '#f59e0b'
          }).catch(e => console.error('[Gmail Worker] Expiry email error:', e));
        }
      }
    }

    return { expiredCount: overdueSubs.length };
  },

  /**
   * Proactive Expiration Warning Notifications (Requirement 14)
   * Sends notices 7 days, 3 days, and 1 day before expiration.
   */
  async sendUpcomingExpiryWarnings(): Promise<void> {
    const prisma = getPrisma();
    const now = new Date();

    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        endDate: { gt: now }
      },
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    for (const sub of activeSubs) {
      const diffMs = new Date(sub.endDate).getTime() - now.getTime();
      const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (remainingDays === 7 || remainingDays === 3 || remainingDays === 1) {
        const milestoneTag = `(còn ${remainingDays} ngày)`;
        // Check if we already alerted for this milestone to avoid duplicate spam
        const alreadySent = await prisma.notification.findFirst({
          where: {
            userId: sub.userId,
            title: { contains: milestoneTag },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        });

        if (!alreadySent) {
          const title = `Gói dịch vụ sắp hết hạn ${milestoneTag}`;
          const message = `Gói ${sub.planName} của bạn sẽ hết hạn vào ngày ${new Date(sub.endDate).toLocaleDateString('vi-VN')}. Vui lòng gia hạn để duy trì toàn bộ tính năng và dữ liệu đồng bộ.`;

          await prisma.notification.create({
            data: {
              userId: sub.userId,
              title,
              message,
              type: 'Warning',
              read: false
            }
          });

          if (sub.user?.email) {
            gmailService.sendNotification({
              to: sub.user.email,
              recipientName: sub.user.name || 'Khách hàng',
              subject: `⚠️ [Life OS] Gói ${sub.planName} sắp hết hạn ${milestoneTag}`,
              category: 'SUBSCRIPTION',
              headline: `Chỉ còn ${remainingDays} ngày là gói dịch vụ sẽ kết thúc`,
              content: `Gói tài khoản <strong>${sub.planName}</strong> của bạn sẽ hết hạn vào ngày <strong>${new Date(sub.endDate).toLocaleDateString('vi-VN')}</strong>.<br/><br/>Hãy gia hạn ngay hôm nay để duy trì chuỗi làm việc và dữ liệu đồng bộ liên tục.`,
              actionLabel: 'Gia hạn gói ngay',
              actionUrl: getAppBaseUrl(),
              badgeText: `Còn ${remainingDays} ngày`,
              badgeColor: '#3b82f6'
            }).catch(e => console.error('[Gmail Worker] Warning email error:', e));
          }
        }
      }
    }
  },

  /**
   * Admin Subscription Management & Audit List (Requirement 13)
   */
  async getSubscriptionsList(options: {
    status?: string;
    search?: string;
    planId?: string;
    page?: number;
    limit?: number;
  }) {
    const prisma = getPrisma();
    const { status, search, planId, page = 1, limit = 50 } = options;
    const now = new Date();

    // Lazy sweep overdue subscriptions first for 100% precision
    await this.expireOverdueSubscriptions();

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (planId && planId !== 'ALL') {
      whereClause.planId = planId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { txReference: { contains: q, mode: 'insensitive' } },
        { planName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [total, subscriptions, activeCount, expiredCount, cancelledCount, pendingPaymentsCount] = await Promise.all([
      prisma.subscription.count({ where: whereClause }),
      prisma.subscription.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.subscription.count({ where: { status: 'ACTIVE', endDate: { gt: now } } }),
      prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } })
    ]);

    const allPaidSubs = await prisma.subscription.findMany({
      where: { paymentStatus: 'PAID' },
      select: { amount: true }
    });
    const totalRevenue = allPaidSubs.reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      subscriptions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      counts: {
        total,
        active: activeCount,
        expired: expiredCount,
        cancelled: cancelledCount,
        pending: pendingPaymentsCount
      },
      totalRevenue
    };
  },

  /**
   * Admin explicitly revokes a user's active subscription immediately
   */
  async revokeSubscription(userId: string, adminEmail: string, reason?: string) {
    const prisma = getPrisma();
    const now = new Date();

    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: {
        status: 'CANCELLED',
        endDate: now
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'FREE',
        planExpiresAt: null
      },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true }
    });

    await prisma.notification.create({
      data: {
        userId,
        title: 'Quyền sử dụng gói dịch vụ đã bị thu hồi',
        message: `Quyền truy cập gói dịch vụ của bạn đã bị thu hồi bởi quản trị viên (${adminEmail}). Lý do: ${reason || 'Theo chính sách vận hành'}.`,
        type: 'Warning',
        read: false
      }
    });

    return updatedUser;
  },

  /**
   * Admin grants or extends a subscription manually
   */
  async grantSubscription(userId: string, planId: string, durationDays: number, adminEmail: string, reason?: string) {
    const subscription = await this.activateSubscription(userId, planId, {
      txReference: `MANUAL_GRANT_${Date.now()}`,
      customDurationDays: durationDays,
      amount: 0 // No money received — must not count as revenue
    });

    const prisma = getPrisma();
    await prisma.notification.create({
      data: {
        userId,
        title: `Gói ${subscription.planName} đã được cấp thành công`,
        message: `Quản trị viên (${adminEmail}) đã cấp quyền sử dụng gói ${subscription.planName} (${durationDays} ngày) cho tài khoản của bạn. Hạn dùng đến ${new Date(subscription.endDate).toLocaleDateString('vi-VN')}.`,
        type: 'Success',
        read: false
      }
    });

    return subscription;
  },

  /**
   * SaaS Operational Metrics & KPIs for Admin Dashboard
   */
  async getSaaSMetrics() {
    const prisma = getPrisma();
    const now = new Date();

    const [totalUsers, activeSubCount, pendingPaymentsCount, allPayments, expiredSubsCount] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          endDate: { gt: now }
        }
      }),
      prisma.payment.count({
        where: { status: 'PENDING' }
      }),
      prisma.payment.findMany({
        where: { status: { in: ['APPROVED', 'Paid'] } },
        select: { amount: true, createdAt: true, planRequested: true }
      }),
      prisma.subscription.count({
        where: {
          status: { in: ['EXPIRED', 'CANCELLED'] },
          endDate: { lte: now }
        }
      })
    ]);

    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        endDate: { gt: now }
      },
      select: { amount: true, durationDays: true }
    });

    const mrr = activeSubs.reduce((sum, sub) => {
      const days = sub.durationDays || 30;
      const monthlyFactor = 30 / days;
      return sum + Math.round(sub.amount * monthlyFactor);
    }, 0);

    const unpaidUsers = Math.max(0, totalUsers - activeSubCount - pendingPaymentsCount);
    const conversionRatePercent = totalUsers > 0 ? Math.round((activeSubCount / totalUsers) * 1000) / 10 : 0;

    return {
      totalUsers,
      activeSubscribers: activeSubCount,
      unpaidUsers,
      pendingApprovalCount: pendingPaymentsCount,
      expiredUsers: expiredSubsCount,
      totalRevenue,
      mrr,
      conversionRatePercent
    };
  }
};
