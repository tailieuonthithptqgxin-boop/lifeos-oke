import { getPrisma } from '../db.js';

export interface PlanDefinition {
  id: string;
  name: string;
  type: 'PERSONAL' | 'TEAM';
  durationDays: number;
  price: number;
  billingCycle: string;
  badge?: string;
  description: string;
  features: string[];
  maxTeamMembers?: number;
}

export const OFFICIAL_PLANS: PlanDefinition[] = [
  {
    id: 'PRO',
    name: 'Pro',
    type: 'PERSONAL',
    durationDays: 30,
    price: 199000,
    billingCycle: '30 ngày',
    badge: 'Chuyên nghiệp',
    description: 'Gói chuyên nghiệp Pro cho cá nhân quản lý toàn diện.',
    features: [
      'Toàn bộ tính năng Quản lý Công việc & Dự án (Kanban, Lịch, Bộ lọc)',
      'Quản lý Tài chính, Ví tiền, Ngân sách và Báo cáo thu chi',
      'Theo dõi Thói quen, Chuỗi streak và Mục tiêu cuộc sống',
      'Decision Engine & Mô phỏng kịch bản What-if',
      'Automation Rules Engine kích hoạt tự động',
      'Không gian Học tập, Pomodoro Focus và Ghi chú không giới hạn'
    ]
  },
  {
    id: 'PERSONAL_1M',
    name: 'Gói Cá Nhân (1 Tháng)',
    type: 'PERSONAL',
    durationDays: 30,
    price: 15000,
    billingCycle: '1 tháng (30 ngày)',
    badge: 'Tiết kiệm',
    description: 'Mở khóa toàn bộ tính năng quản trị cá nhân LifeOS trong 1 tháng.',
    features: [
      'Toàn bộ tính năng Quản lý Công việc (Kanban, Lịch, Bộ lọc)',
      'Quản lý Tài chính, Ví tiền, Ngân sách và Báo cáo thu chi',
      'Theo dõi Thói quen, Chuỗi streak và Mục tiêu cuộc sống',
      'Decision Engine & Mô phỏng kịch bản What-if',
      'Automation Rules Engine kích hoạt tự động',
      'Không gian Học tập, Pomodoro Focus và Ghi chú không giới hạn'
    ]
  },
  {
    id: 'PERSONAL_3M',
    name: 'Gói Cá Nhân (3 Tháng)',
    type: 'PERSONAL',
    durationDays: 90,
    price: 40000,
    billingCycle: '3 tháng (90 ngày)',
    badge: 'Phổ biến nhất',
    description: 'Mở khóa toàn bộ tính năng trong 3 tháng liên tục với chi phí tiết kiệm hơn.',
    features: [
      'Bao gồm toàn bộ quyền lợi của Gói Cá Nhân 1 Tháng',
      'Thời hạn sử dụng 90 ngày liên tục',
      'Tiết kiệm 5.000 VNĐ so với gia hạn từng tháng',
      'Đồng bộ dữ liệu thời gian thực và sao lưu tự động',
      'Hỗ trợ kỹ thuật ưu tiên 24/7'
    ]
  },
  {
    id: 'TEAM_1M',
    name: 'Gói Đội Ngũ (Team 1 Tháng)',
    type: 'TEAM',
    durationDays: 30,
    price: 50000,
    billingCycle: '1 tháng (30 ngày)',
    badge: 'Dành cho Đội ngũ',
    maxTeamMembers: 5,
    description: 'Dành cho đội ngũ cộng tác. Chủ team được mời thêm tối đa 5 người dùng cùng sử dụng đầy đủ chức năng.',
    features: [
      'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
      'Cho phép Chủ Team thêm tối đa 5 người dùng vào Team',
      'Tất cả thành viên trong Team được hưởng toàn bộ tính năng trả phí',
      'Chủ Team có toàn quyền quản trị, thêm/xóa thành viên linh hoạt',
      'Tự động đồng bộ quyền hạn khi gói Team còn hạn'
    ]
  },
  {
    id: 'TEAM',
    name: 'Team',
    type: 'TEAM',
    durationDays: 30,
    price: 499000,
    billingCycle: '30 ngày',
    badge: 'Dành cho Đội ngũ',
    maxTeamMembers: 5,
    description: 'Dành cho doanh nghiệp và đội ngũ cộng tác không giới hạn.',
    features: [
      'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
      'Cho phép Chủ Team thêm tối đa 5 người dùng vào Team'
    ]
  }
];

export type AccountLifecycleStatus = 'UNPAID' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'DISABLED';

export interface UserSubscriptionStatus {
  hasAccess: boolean;
  lifecycleStatus: AccountLifecycleStatus;
  planId: string;
  planType: 'PERSONAL' | 'TEAM' | 'NONE';
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NONE';
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
}

export const subscriptionService = {
  getPlans(): PlanDefinition[] {
    return OFFICIAL_PLANS;
  },

  getPlanById(planId: string): PlanDefinition | undefined {
    const cleanId = planId?.toUpperCase();
    if (cleanId === 'PRO') return OFFICIAL_PLANS.find(p => p.id === 'PRO');
    if (cleanId === 'TEAM') return OFFICIAL_PLANS.find(p => p.id === 'TEAM');
    return OFFICIAL_PLANS.find(p => p.id === cleanId);
  },

  async checkUserSubscription(userId: string): Promise<UserSubscriptionStatus> {
    const prisma = getPrisma();
    const now = new Date();

    // 1. Check user model & role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, plan: true, planExpiresAt: true, status: true }
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

    // Suspended or Disabled user accounts
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

    // Admins and SuperAdmins always have full operational access
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

    // Check if there is an active pending payment request awaiting approval
    const activePending = await prisma.payment.findFirst({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Check direct personal or team-owner active subscription
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

    // 3. Check if user is a member of an active Team
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

      // Check if team subscription is active and not expired
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

    // 4. Check if there was an expired subscription
    const latestSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { endDate: 'desc' }
    });

    if (latestSub) {
      return {
        hasAccess: false,
        lifecycleStatus: activePending ? 'PENDING' : 'EXPIRED',
        planId: latestSub.planId,
        planType: (latestSub.planType as any) || 'PERSONAL',
        planName: latestSub.planName,
        status: 'EXPIRED',
        amount: latestSub.amount,
        startDate: latestSub.startDate.toISOString(),
        endDate: latestSub.endDate.toISOString(),
        remainingDays: 0,
        subscriptionId: latestSub.id,
        activePending: activePending || null
      };
    }

    // 5. No subscription found -> PENDING if has payment request, or UNPAID
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

  async activateSubscription(userId: string, planId: string, paymentInfo?: { txReference?: string; paymentId?: string; customDurationDays?: number }): Promise<any> {
    const plan = this.getPlanById(planId) || OFFICIAL_PLANS[0];
    const durationDays = paymentInfo?.customDurationDays || plan.durationDays || 30;

    const prisma = getPrisma();
    const now = new Date();

    // Check if user currently has active subscription to extend
    const existingActive = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        endDate: { gt: now }
      },
      orderBy: { endDate: 'desc' }
    });

    const baseDate = existingActive ? new Date(existingActive.endDate) : now;
    const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Deactivate previous active subscriptions to keep one primary active
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        planType: plan.type,
        planName: plan.name,
        amount: plan.price,
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

    // Sync user model plan and expiration
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
   * Admin explicitly revokes a user's active subscription immediately
   */
  async revokeSubscription(userId: string, adminEmail: string, reason?: string) {
    const prisma = getPrisma();
    const now = new Date();

    // 1. Mark all active subscriptions as CANCELLED and set endDate to past
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: {
        status: 'CANCELLED',
        endDate: now
      }
    });

    // 2. Revert user to FREE and nullify planExpiresAt
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'FREE',
        planExpiresAt: null
      },
      select: { id: true, name: true, email: true, role: true, plan: true, planExpiresAt: true, status: true }
    });

    // 3. Notify user
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
      customDurationDays: durationDays
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

    // Approximate Monthly Recurring Revenue (MRR) based on active subs
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
