import { getPrisma } from '../db.js';
import { subscriptionService } from './subscription.service.js';

export const teamService = {
  async getMyTeam(userId: string) {
    const prisma = getPrisma();

    // 1. Check if user is owner of a team
    const ownedTeam = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        subscription: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          },
          orderBy: { addedAt: 'asc' }
        }
      }
    });

    if (ownedTeam) {
      const now = new Date();
      const isSubActive = Boolean(
        ownedTeam.subscription &&
        ownedTeam.subscription.status === 'ACTIVE' &&
        ownedTeam.subscription.paymentStatus === 'PAID' &&
        new Date(ownedTeam.subscription.endDate).getTime() > now.getTime()
      );

      const maxMembers = ownedTeam.maxMembers || 5;
      const currentMemberCount = ownedTeam.members.length;
      const remainingSlots = Math.max(0, maxMembers - currentMemberCount);

      return {
        role: 'OWNER',
        team: {
          id: ownedTeam.id,
          name: ownedTeam.name,
          ownerId: ownedTeam.ownerId,
          owner: ownedTeam.owner,
          maxMembers,
          currentMemberCount,
          remainingSlots,
          canAddMembers: isSubActive && remainingSlots > 0,
          isSubscriptionActive: isSubActive,
          subscription: ownedTeam.subscription ? {
            id: ownedTeam.subscription.id,
            planName: ownedTeam.subscription.planName,
            status: isSubActive ? 'ACTIVE' : 'EXPIRED',
            endDate: ownedTeam.subscription.endDate.toISOString(),
            remainingDays: isSubActive ? Math.ceil((new Date(ownedTeam.subscription.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
          } : null,
          members: ownedTeam.members.map(m => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
            role: m.role,
            addedAt: m.addedAt.toISOString()
          }))
        }
      };
    }

    // 2. Check if user is a member of someone else's team
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      include: {
        team: {
          include: {
            owner: { select: { id: true, name: true, email: true, avatar: true } },
            subscription: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } }
              },
              orderBy: { addedAt: 'asc' }
            }
          }
        }
      }
    });

    if (membership && membership.team) {
      const team = membership.team;
      const now = new Date();
      const isSubActive = Boolean(
        team.subscription &&
        team.subscription.status === 'ACTIVE' &&
        team.subscription.paymentStatus === 'PAID' &&
        new Date(team.subscription.endDate).getTime() > now.getTime()
      );

      return {
        role: 'MEMBER',
        team: {
          id: team.id,
          name: team.name,
          ownerId: team.ownerId,
          owner: team.owner,
          maxMembers: team.maxMembers,
          currentMemberCount: team.members.length,
          isSubscriptionActive: isSubActive,
          subscription: team.subscription ? {
            id: team.subscription.id,
            planName: team.subscription.planName,
            status: isSubActive ? 'ACTIVE' : 'EXPIRED',
            endDate: team.subscription.endDate.toISOString(),
            remainingDays: isSubActive ? Math.ceil((new Date(team.subscription.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
          } : null,
          members: team.members.map(m => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
            role: m.role,
            addedAt: m.addedAt.toISOString()
          }))
        }
      };
    }

    return {
      role: 'NONE',
      team: null
    };
  },

  async createOrUpdateTeamName(ownerId: string, name: string) {
    const prisma = getPrisma();
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Tên nhóm không được để trống.');

    const subStatus = await subscriptionService.checkUserSubscription(ownerId);
    if (!subStatus.hasAccess || (subStatus.planType !== 'TEAM' && subStatus.role !== 'SUPERADMIN' && subStatus.role !== 'ADMIN')) {
      throw new Error('Chỉ tài khoản đăng ký gói Team mới có quyền quản lý và đặt tên nhóm.');
    }

    const existing = await prisma.team.findFirst({ where: { ownerId } });
    if (existing) {
      return await prisma.team.update({
        where: { id: existing.id },
        data: { name: cleanName }
      });
    }

    return await prisma.team.create({
      data: {
        name: cleanName,
        ownerId,
        subscriptionId: subStatus.subscriptionId || null,
        maxMembers: 5
      }
    });
  },

  async addMember(ownerId: string, email: string) {
    const prisma = getPrisma();
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail) {
      throw new Error('Vui lòng nhập địa chỉ email của thành viên.');
    }

    // 1. Verify owner's team subscription
    const subStatus = await subscriptionService.checkUserSubscription(ownerId);
    if (!subStatus.hasAccess || (subStatus.planType !== 'TEAM' && subStatus.role !== 'SUPERADMIN' && subStatus.role !== 'ADMIN')) {
      throw new Error('Tài khoản của bạn không có gói Team đang hoạt động để thêm thành viên.');
    }

    // 2. Retrieve or create team for owner
    let team = await prisma.team.findFirst({
      where: { ownerId },
      include: {
        members: true
      }
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'Nhóm làm việc của tôi',
          ownerId,
          subscriptionId: subStatus.subscriptionId || null,
          maxMembers: 5
        },
        include: {
          members: true
        }
      });
    }

    // 3. Strictly enforce max 5 added members
    const maxLimit = team.maxMembers || 5;
    if (team.members.length >= maxLimit) {
      const err = new Error(`Nhóm đã đạt số lượng tối đa ${maxLimit} thành viên. Không thể thêm người dùng mới.`);
      (err as any).code = 'TEAM_MEMBER_LIMIT_REACHED';
      throw err;
    }

    // 4. Find target user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, name: true }
    });

    if (!targetUser) {
      throw new Error(`Không tìm thấy tài khoản người dùng với email '${cleanEmail}'. Người dùng cần đăng ký tài khoản trước.`);
    }

    if (targetUser.id === ownerId) {
      throw new Error('Chủ nhóm đã sở hữu toàn quyền quản trị, không cần thêm chính mình vào danh sách thành viên.');
    }

    // 5. Check if user is already a member
    const isAlreadyMember = team.members.some(m => m.userId === targetUser.id);
    if (isAlreadyMember) {
      throw new Error(`Người dùng '${targetUser.name}' (${cleanEmail}) đã là thành viên trong nhóm.`);
    }

    // 6. Create team membership
    const membership = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: targetUser.id,
        role: 'MEMBER'
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    // 7. Notify target user
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: 'Bạn được thêm vào Gói Team LifeOS!',
        message: `Bạn vừa được thêm vào nhóm "${team.name}". Toàn bộ tính năng cao cấp của LifeOS đã được kích hoạt cho tài khoản của bạn.`,
        type: 'success'
      }
    }).catch(() => {});

    return {
      success: true,
      message: `Đã thêm thành viên '${targetUser.name}' vào nhóm thành công.`,
      member: {
        id: membership.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: membership.role,
        addedAt: membership.addedAt.toISOString()
      }
    };
  },

  async removeMember(requesterId: string, memberUserId: string) {
    const prisma = getPrisma();

    // 1. Find the membership
    const membership = await prisma.teamMember.findFirst({
      where: { userId: memberUserId },
      include: {
        team: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!membership) {
      throw new Error('Thành viên này không tồn tại trong bất kỳ nhóm nào.');
    }

    // 2. Validate permission: only team owner or the member themselves can remove
    const isOwner = membership.team.ownerId === requesterId;
    const isSelf = memberUserId === requesterId;

    if (!isOwner && !isSelf) {
      throw new Error('Bạn không có quyền xóa thành viên này khỏi nhóm.');
    }

    // 3. Remove membership
    await prisma.teamMember.delete({
      where: { id: membership.id }
    });

    // 4. Notify removed user
    await prisma.notification.create({
      data: {
        userId: memberUserId,
        title: 'Rời khỏi Gói Team LifeOS',
        message: isSelf
          ? `Bạn đã rời khỏi nhóm "${membership.team.name}".`
          : `Bạn đã được đưa ra khỏi nhóm "${membership.team.name}". Quyền sử dụng gói Team đã kết thúc.`,
        type: 'info'
      }
    }).catch(() => {});

    return {
      success: true,
      message: isSelf ? 'Đã rời khỏi nhóm thành công.' : `Đã xóa thành viên '${membership.user.name}' khỏi nhóm.`
    };
  }
};
