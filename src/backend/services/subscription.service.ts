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

export interface UserSubscriptionStatus {
  hasAccess: boolean;
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

    // 1. Check user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, plan: true, planExpiresAt: true }
    });

    if (!user) {
      return {
        hasAccess: false,
        planId: 'NONE',
        planType: 'NONE',
        planName: 'Không xác định',
        status: 'NONE',
        remainingDays: 0
      };
    }

    // Admins and SuperAdmins always have full operational access
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return {
        hasAccess: true,
        planId: 'ADMIN',
        planType: 'TEAM',
        planName: 'Quản trị viên Hệ thống',
        status: 'ACTIVE',
        remainingDays: 9999,
        role: user.role
      };
    }

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
        subscriptionId: directSub.id
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
          subscriptionId: teamSub.id
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
        planId: latestSub.planId,
        planType: (latestSub.planType as any) || 'PERSONAL',
        planName: latestSub.planName,
        status: 'EXPIRED',
        amount: latestSub.amount,
        startDate: latestSub.startDate.toISOString(),
        endDate: latestSub.endDate.toISOString(),
        remainingDays: 0,
        subscriptionId: latestSub.id
      };
    }

    // 5. No subscription found
    return {
      hasAccess: false,
      planId: 'NONE',
      planType: 'NONE',
      planName: 'Chưa kích hoạt gói',
      status: 'NONE',
      remainingDays: 0
    };
  },

  async activateSubscription(userId: string, planId: string, paymentInfo?: { txReference?: string; paymentId?: string }): Promise<any> {
    const plan = this.getPlanById(planId);
    if (!plan) {
      throw new Error(`Gói dịch vụ '${planId}' không hợp lệ.`);
    }

    const prisma = getPrisma();
    const now = new Date();

    // Check if user currently has active subscription of same or personal type to extend
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
    const endDate = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

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
        durationDays: plan.durationDays,
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
  }
};
