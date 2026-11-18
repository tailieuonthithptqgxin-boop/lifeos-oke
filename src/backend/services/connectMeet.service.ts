import { getPrisma } from '../db.js';
import { ConnectCommunityService } from './connectCommunity.service.js';

export interface CreateMeetDto {
  title: string;
  description?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  isInstant?: boolean;
  requireApproval?: boolean;
  allowMembersDirect?: boolean;
}

export class ConnectMeetService {
  // Generate a friendly unique room code
  private static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MEET-';
    for (let i = 0; i < 3; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 3; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  // Create Meet
  public static async createMeet(userId: string, communityId: string, data: CreateMeetDto) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Nhóm không tồn tại.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const isOwner = community.ownerId === userId;
    if (!isOwner && membership?.status !== 'ACTIVE') {
      throw new Error('Chỉ thành viên chính thức mới có quyền tổ chức Meet.');
    }

    const host = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true }
    });

    const roomCode = this.generateRoomCode();
    const isInstant = data.isInstant ?? true;

    const meet = await prisma.communityMeet.create({
      data: {
        roomCode,
        communityId,
        hostId: userId,
        title: data.title.trim() || 'Buổi học nhóm trực tuyến',
        description: data.description?.trim() || null,
        scheduledDate: data.scheduledDate || null,
        scheduledTime: data.scheduledTime || null,
        isInstant,
        status: isInstant ? 'LIVE' : 'SCHEDULED',
        requireApproval: data.requireApproval ?? true,
        allowMembersDirect: data.allowMembersDirect ?? true,
        activeParticipants: isInstant ? [{
          userId,
          name: host?.name || 'Chủ phòng',
          avatar: host?.avatar || null,
          isHost: true,
          isMuted: false,
          joinedAt: new Date().toISOString()
        }] : [],
        waitingParticipants: [],
        notes: `📌 BẢNG GHI CHÚ CHUNG CHO BUỔI MEET: ${data.title}\n- Mục tiêu: Hoàn thành nhiệm vụ học tập\n- Quy tắc: Tập trung, không làm phiền bạn học`,
        pomodoroState: {
          isRunning: false,
          mode: 'focus',
          durationMinutes: 25,
          timeLeftSeconds: 25 * 60,
          startedAt: null
        }
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true }
        },
        community: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    // AUTO-BROADCAST 1: Post Meet card to #📢-thông-báo-lịch-hẹn channel
    try {
      const channels = await ConnectCommunityService.ensureDefaultChannels(communityId);
      const annChannel = channels.find(c => c.type === 'ANNOUNCEMENT') || channels[0];
      if (annChannel) {
        await ConnectCommunityService.sendChannelMessage(userId, communityId, annChannel.id, {
          content: isInstant
            ? `🔴 PHÒNG HỌC MEET ĐANG MỞ: "${meet.title}"! Bấm thẻ bên dưới để vào học cùng nhóm ngay.`
            : `📅 LỊCH HẸN HỌC MEET: "${meet.title}" vào ngày ${data.scheduledDate} lúc ${data.scheduledTime}. Đăng ký nhận nhắc hẹn bên dưới!`,
          meetData: {
            roomCode: meet.roomCode,
            title: meet.title,
            isInstant,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            hostName: host?.name || 'Chủ phòng'
          }
        });
      }
    } catch (err) {
      console.warn('Lỗi tự động gửi thông báo chat meet:', err);
    }

    // AUTO-BROADCAST 2: Post to Community Feed
    try {
      await prisma.post.create({
        data: {
          userId,
          communityId,
          content: isInstant
            ? `🎥 [LIVE MEET] ${host?.name} vừa mở phòng học trực tuyến "${meet.title}"! Tham gia cùng nhóm ngay.`
            : `📅 [LỊCH HẸN MEET] Nhóm có lịch học "${meet.title}" vào ${data.scheduledDate} ${data.scheduledTime}. Hãy vào đăng ký nhắc hẹn nhé!`,
          meetSession: {
            roomCode: meet.roomCode,
            title: meet.title,
            isInstant,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            hostName: host?.name || 'Chủ phòng'
          },
          status: 'PUBLISHED'
        }
      });
      await prisma.community.update({
        where: { id: communityId },
        data: { postCount: { increment: 1 } }
      });
    } catch (err) {
      console.warn('Lỗi tự động đăng bài feed meet:', err);
    }

    return { success: true, meet, message: 'Đã tạo phòng Meet thành công.' };
  }

  // List meets in a community
  public static async listMeets(userId: string, communityId: string) {
    const prisma = getPrisma();
    const meets = await prisma.communityMeet.findMany({
      where: {
        communityId,
        status: { in: ['LIVE', 'SCHEDULED'] }
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return meets;
  }

  // Get Meet Details by roomCode
  public static async getMeetByCode(userId: string, roomCode: string) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({
      where: { roomCode },
      include: {
        host: {
          select: { id: true, name: true, avatar: true }
        },
        community: {
          select: { id: true, name: true, slug: true, privacy: true }
        }
      }
    });

    if (!meet) throw new Error('Không tìm thấy phòng Meet.');

    // Check user role
    const isHost = meet.hostId === userId;
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: meet.communityId, userId } }
    });
    const isGroupMember = membership?.status === 'ACTIVE' || isHost;

    const activeList = (meet.activeParticipants as any[]) || [];
    const waitingList = (meet.waitingParticipants as any[]) || [];

    const isInside = activeList.some(p => p.userId === userId);
    const isWaiting = waitingList.some(p => p.userId === userId);

    return {
      ...meet,
      isHost,
      isGroupMember,
      isInside,
      isWaiting,
      activeParticipantsCount: activeList.length,
      waitingParticipantsCount: waitingList.length
    };
  }

  // Join Meet (Lobby / Waiting Room logic)
  public static async joinMeet(userId: string, roomCode: string) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({
      where: { roomCode },
      include: { community: true }
    });

    if (!meet) throw new Error('Phòng Meet không tồn tại.');
    if (meet.status === 'ENDED') throw new Error('Buổi Meet này đã kết thúc.');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true }
    });

    const isHost = meet.hostId === userId;
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: meet.communityId, userId } }
    });
    const isGroupMember = membership?.status === 'ACTIVE' || isHost;

    const activeList = (meet.activeParticipants as any[]) || [];
    const waitingList = (meet.waitingParticipants as any[]) || [];

    // Already inside
    if (activeList.some(p => p.userId === userId)) {
      return { success: true, status: 'IN_MEET', meet };
    }

    // Host always joins directly
    if (isHost) {
      activeList.push({
        userId,
        name: user?.name || 'Chủ phòng',
        avatar: user?.avatar || null,
        isHost: true,
        isMuted: false,
        joinedAt: new Date().toISOString()
      });
      const updated = await prisma.communityMeet.update({
        where: { id: meet.id },
        data: { activeParticipants: activeList, status: 'LIVE' }
      });
      return { success: true, status: 'IN_MEET', meet: updated };
    }

    // Direct entry if allowed for members
    if (meet.allowMembersDirect && isGroupMember) {
      const cleanWaiting = waitingList.filter(p => p.userId !== userId);
      activeList.push({
        userId,
        name: user?.name || 'Thành viên',
        avatar: user?.avatar || null,
        isHost: false,
        isMuted: false,
        joinedAt: new Date().toISOString()
      });
      const updated = await prisma.communityMeet.update({
        where: { id: meet.id },
        data: {
          activeParticipants: activeList,
          waitingParticipants: cleanWaiting,
          status: 'LIVE'
        }
      });
      return { success: true, status: 'IN_MEET', meet: updated };
    }

    // Otherwise, place into Waiting Room (Phòng Chờ)
    if (!waitingList.some(p => p.userId === userId)) {
      waitingList.push({
        userId,
        name: user?.name || 'Thành viên chờ duyệt',
        avatar: user?.avatar || null,
        isGroupMember,
        requestedAt: new Date().toISOString()
      });
      await prisma.communityMeet.update({
        where: { id: meet.id },
        data: { waitingParticipants: waitingList }
      });
    }

    return {
      success: true,
      status: 'WAITING',
      message: 'Bạn đang ở Phòng Chờ. Vui lòng đợi Người tổ chức duyệt cho bạn vào.'
    };
  }

  // Host: Approve waiting participant
  public static async approveWaitingParticipant(hostUserId: string, roomCode: string, targetUserId: string) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({ where: { roomCode } });
    if (!meet) throw new Error('Phòng không tồn tại.');
    if (meet.hostId !== hostUserId) throw new Error('Chỉ Người tổ chức mới có quyền duyệt người vào phòng.');

    const waitingList = (meet.waitingParticipants as any[]) || [];
    const activeList = (meet.activeParticipants as any[]) || [];

    const target = waitingList.find(p => p.userId === targetUserId);
    if (!target) throw new Error('Người này không còn trong phòng chờ.');

    const newWaiting = waitingList.filter(p => p.userId !== targetUserId);
    if (!activeList.some(p => p.userId === targetUserId)) {
      activeList.push({
        userId: target.userId,
        name: target.name,
        avatar: target.avatar,
        isHost: false,
        isMuted: false,
        joinedAt: new Date().toISOString()
      });
    }

    const updated = await prisma.communityMeet.update({
      where: { id: meet.id },
      data: {
        waitingParticipants: newWaiting,
        activeParticipants: activeList
      }
    });

    return { success: true, meet: updated, message: `Đã duyệt cho ${target.name} vào phòng Meet.` };
  }

  // Host: Reject waiting participant
  public static async rejectWaitingParticipant(hostUserId: string, roomCode: string, targetUserId: string) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({ where: { roomCode } });
    if (!meet) throw new Error('Phòng không tồn tại.');
    if (meet.hostId !== hostUserId) throw new Error('Chỉ Người tổ chức mới có quyền từ chối người vào phòng.');

    const waitingList = (meet.waitingParticipants as any[]) || [];
    const newWaiting = waitingList.filter(p => p.userId !== targetUserId);

    const updated = await prisma.communityMeet.update({
      where: { id: meet.id },
      data: { waitingParticipants: newWaiting }
    });

    return { success: true, meet: updated, message: 'Đã từ chối người dùng vào phòng Meet.' };
  }

  // Host: Approve all waiting
  public static async approveAllWaiting(hostUserId: string, roomCode: string) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({ where: { roomCode } });
    if (!meet) throw new Error('Phòng không tồn tại.');
    if (meet.hostId !== hostUserId) throw new Error('Chỉ Người tổ chức mới có quyền duyệt tất cả.');

    const waitingList = (meet.waitingParticipants as any[]) || [];
    const activeList = (meet.activeParticipants as any[]) || [];

    waitingList.forEach(w => {
      if (!activeList.some(a => a.userId === w.userId)) {
        activeList.push({
          userId: w.userId,
          name: w.name,
          avatar: w.avatar,
          isHost: false,
          isMuted: false,
          joinedAt: new Date().toISOString()
        });
      }
    });

    const updated = await prisma.communityMeet.update({
      where: { id: meet.id },
      data: {
        waitingParticipants: [],
        activeParticipants: activeList
      }
    });

    return { success: true, meet: updated, count: waitingList.length, message: `Đã duyệt tất cả ${waitingList.length} người vào phòng.` };
  }

  // Host: In-Meet Controls
  public static async updateMeetControls(userId: string, roomCode: string, controls: {
    notes?: string;
    pomodoroAction?: 'start' | 'pause' | 'reset' | 'switch';
    toggleMuteUser?: string;
    kickUser?: string;
    endMeet?: boolean;
    allowMembersDirect?: boolean;
    requireApproval?: boolean;
    selfMute?: boolean;
  }) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({ where: { roomCode } });
    if (!meet) throw new Error('Phòng không tồn tại.');

    const isHost = meet.hostId === userId;
    let activeList = (meet.activeParticipants as any[]) || [];
    const updateData: any = {};

    // 1. Shared Notes (Any active participant can edit notes)
    if (controls.notes !== undefined) {
      updateData.notes = controls.notes;
    }

    // 2. Self Mute
    if (controls.selfMute !== undefined) {
      activeList = activeList.map(p => p.userId === userId ? { ...p, isMuted: controls.selfMute } : p);
      updateData.activeParticipants = activeList;
    }

    // HOST-ONLY CONTROLS
    if (isHost) {
      // Allow direct / require approval toggles
      if (controls.allowMembersDirect !== undefined) updateData.allowMembersDirect = Boolean(controls.allowMembersDirect);
      if (controls.requireApproval !== undefined) updateData.requireApproval = Boolean(controls.requireApproval);

      // Mute other user
      if (controls.toggleMuteUser) {
        activeList = activeList.map(p => p.userId === controls.toggleMuteUser ? { ...p, isMuted: !p.isMuted } : p);
        updateData.activeParticipants = activeList;
      }

      // Kick user
      if (controls.kickUser) {
        activeList = activeList.filter(p => p.userId !== controls.kickUser);
        updateData.activeParticipants = activeList;
      }

      // Pomodoro synchronization
      if (controls.pomodoroAction) {
        const currentPomo = (meet.pomodoroState as any) || { durationMinutes: 25, timeLeftSeconds: 1500, mode: 'focus', isRunning: false };
        if (controls.pomodoroAction === 'start') {
          updateData.pomodoroState = { ...currentPomo, isRunning: true, startedAt: new Date().toISOString() };
        } else if (controls.pomodoroAction === 'pause') {
          updateData.pomodoroState = { ...currentPomo, isRunning: false };
        } else if (controls.pomodoroAction === 'reset') {
          updateData.pomodoroState = { ...currentPomo, isRunning: false, timeLeftSeconds: currentPomo.durationMinutes * 60 };
        } else if (controls.pomodoroAction === 'switch') {
          const nextMode = currentPomo.mode === 'focus' ? 'break' : 'focus';
          const nextMins = nextMode === 'focus' ? 25 : 5;
          updateData.pomodoroState = { mode: nextMode, durationMinutes: nextMins, timeLeftSeconds: nextMins * 60, isRunning: true, startedAt: new Date().toISOString() };
        }
      }

      // End meet for all
      if (controls.endMeet) {
        updateData.status = 'ENDED';
        updateData.endedAt = new Date();
      }
    }

    const updated = await prisma.communityMeet.update({
      where: { id: meet.id },
      data: updateData
    });

    return { success: true, meet: updated };
  }

  // Register Reminder (Schedule + Gmail Engine Integration)
  public static async registerMeetReminder(userId: string, roomCode: string) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({
      where: { roomCode },
      include: { host: true, community: true }
    });
    if (!meet) throw new Error('Phòng Meet không tồn tại.');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại.');

    // 1. Create Calendar Event in User's schedule
    const eventDate = meet.scheduledDate || new Date().toISOString().split('T')[0];
    const eventTime = meet.scheduledTime || '20:00';

    await prisma.calendarEvent.create({
      data: {
        userId,
        title: `🎥 Meet Học Nhóm: ${meet.title}`,
        description: `Phòng Meet nhóm [${meet.community.name}]. Mã phòng: ${meet.roomCode}. Host: ${meet.host.name}. Link trực tiếp: https://easy-island-responses-macro.trycloudflare.com/?tab=connect&room=${meet.roomCode}`,
        startDate: new Date(`${eventDate}T${eventTime}:00Z`),
        endDate: new Date(new Date(`${eventDate}T${eventTime}:00Z`).getTime() + 60 * 60 * 1000),
        category: 'Study',
        isAllDay: false
      }
    });

    // 2. Enqueue notification reminders (2h, 1h, 30m)
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: `🔔 Đã đăng ký lịch hẹn Meet "${meet.title}"`,
          message: `Lịch hẹn diễn ra vào ${eventDate} lúc ${eventTime}. Hệ thống sẽ gửi email và thông báo nhắc bạn trước 2 giờ, 1 giờ và 30 phút!`,
          type: 'MEET_REMINDER'
        }
      });
    } catch (e) {}

    return {
      success: true,
      message: `Đã thêm lịch hẹn Meet vào Thời Gian Biểu của bạn và kích hoạt nhắc hẹn Gmail tự động (trước 2h, 1h, 30p)!`
    };
  }

  // Heartbeat & Study Minutes / Streak Sync
  public static async heartbeatMeet(userId: string, roomCode: string, minutes = 1) {
    const prisma = getPrisma();
    const meet = await prisma.communityMeet.findUnique({ where: { roomCode } });
    if (!meet || meet.status === 'ENDED') return { success: false };

    // Update user's study minutes
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        totalStudyMinutes: { increment: minutes },
        weeklyStudyMinutes: { increment: minutes }
      },
      select: { id: true, totalStudyMinutes: true, streakDays: true }
    });

    return {
      success: true,
      totalStudyMinutes: user.totalStudyMinutes,
      streakDays: user.streakDays
    };
  }
}
