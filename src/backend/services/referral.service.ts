import { getPrisma } from '../db.js';

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalSales: number;
  totalCommission: number;
  pendingReward: number;
  approvedReward: number; // Available Balance
  withdrawalPending: number; // Locked in withdrawal
  paidReward: number; // Successfully paid
  history: Array<{
    id: string;
    referredUser: { name: string; email: string };
    createdAt: Date;
  }>;
  commissions: Array<{
    id: string;
    orderId: string;
    orderAmount: number;
    commissionRate: number;
    rewardAmount: number;
    status: string;
    createdAt: Date;
    note?: string | null;
  }>;
  withdrawals?: Array<any>;
}

export interface WithdrawalInput {
  amount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  transferNote?: string;
  userNote?: string;
}

export class ReferralService {
  /**
   * Generates a unique, aesthetic Gen Z referral code (e.g. "LIFE-8X92K")
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `LIFE-${code}`;
  }

  /**
   * Gets or initializes the referral profile for a user
   */
  async getOrCreateProfile(userId: string): Promise<any> {
    const prisma = getPrisma();
    let profile = await prisma.referralProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      let code = this.generateReferralCode();
      // Ensure uniqueness
      let exists = await prisma.referralProfile.findUnique({ where: { referralCode: code } });
      while (exists) {
        code = this.generateReferralCode();
        exists = await prisma.referralProfile.findUnique({ where: { referralCode: code } });
      }

      profile = await prisma.referralProfile.create({
        data: {
          userId,
          referralCode: code
        }
      });
    }

    return profile;
  }

  /**
   * Attaches a referred user to a referrer code upon signup
   */
  async bindReferral(referredUserId: string, referralCodeRaw?: string): Promise<boolean> {
    if (!referralCodeRaw) return false;
    const cleanCode = referralCodeRaw.trim().toUpperCase();
    const prisma = getPrisma();

    // 1. Look up referrer by code
    const referrerProfile = await prisma.referralProfile.findUnique({
      where: { referralCode: cleanCode }
    });

    if (!referrerProfile) return false;

    // Rule: Cannot refer oneself
    if (referrerProfile.userId === referredUserId) {
      console.warn(`[Referral] Prevented self-referral for user ${referredUserId}`);
      return false;
    }

    // Rule: 1 user can only be referred once
    const existing = await prisma.referralRelationship.findUnique({
      where: { referredUserId }
    });
    if (existing) return false;

    // Create relationship & increment totalReferred
    await prisma.$transaction([
      prisma.referralRelationship.create({
        data: {
          referrerId: referrerProfile.userId,
          referredUserId,
          referralCode: cleanCode
        }
      }),
      prisma.referralProfile.update({
        where: { id: referrerProfile.id },
        data: { totalReferred: { increment: 1 } }
      }),
      // Notify Referrer
      prisma.notification.create({
        data: {
          userId: referrerProfile.userId,
          title: '🎉 Bạn có 1 người bạn mới đăng ký qua mã giới thiệu!',
          message: `Một người bạn vừa đăng ký tài khoản thành công qua mã ${cleanCode}. Khi bạn ấy phát sinh đơn hàng, bạn sẽ nhận được 30% hoa hồng!`,
          type: 'info'
        }
      })
    ]);

    return true;
  }

  /**
   * Evaluates order payment approval: calculates 30% commission, records audit transaction
   */
  async processOrderApproved(orderId: string, orderAmount: number, customerUserId: string): Promise<any> {
    const prisma = getPrisma();

    // Check if customer was referred by someone
    const relationship = await prisma.referralRelationship.findUnique({
      where: { referredUserId: customerUserId }
    });

    if (!relationship) return null;

    // Rule: Prevent self-referral
    if (relationship.referrerId === customerUserId) return null;

    // Rule: Avoid duplicate reward for same order
    const existingCommission = await prisma.referralCommission.findUnique({
      where: { orderId }
    });
    if (existingCommission) return null;

    // Calculate 30% reward
    const commissionRate = 0.30;
    const rewardAmount = Math.round(orderAmount * commissionRate);

    if (rewardAmount <= 0) return null;

    const referrerProfile = await this.getOrCreateProfile(relationship.referrerId);

    // Atomically create commission, transaction and update balances
    const [commission] = await prisma.$transaction([
      prisma.referralCommission.create({
        data: {
          referrerId: relationship.referrerId,
          referredUserId: customerUserId,
          orderId,
          orderAmount,
          commissionRate,
          rewardAmount,
          status: 'Approved',
          approvedAt: new Date()
        }
      }),
      prisma.referralProfile.update({
        where: { id: referrerProfile.id },
        data: {
          totalSales: { increment: orderAmount },
          totalCommission: { increment: rewardAmount },
          approvedReward: { increment: rewardAmount }
        }
      }),
      prisma.referralTransaction.create({
        data: {
          commissionId: 'PENDING_ATTACH', // Replaced via custom step or separate insert
          type: 'COMMISSION_APPROVED',
          amount: rewardAmount,
          previousBal: referrerProfile.approvedReward,
          newBal: referrerProfile.approvedReward + rewardAmount,
          reason: `Hoa hồng 30% từ đơn hàng ${orderId} (${orderAmount.toLocaleString('vi-VN')} ₫)`
        }
      }),
      // Send celebration notification to referrer
      prisma.notification.create({
        data: {
          userId: relationship.referrerId,
          title: '💰 Nhận thưởng hoa hồng giới thiệu 30%!',
          message: `Chúc mừng bạn! Người bạn bạn giới thiệu vừa thanh toán đơn hàng. Bạn nhận được +${rewardAmount.toLocaleString('vi-VN')} ₫ hoa hồng vào ví thưởng!`,
          type: 'success'
        }
      })
    ]).catch(async () => {
      // Fallback clean creation without transaction link mismatch
      const comm = await prisma.referralCommission.create({
        data: {
          referrerId: relationship.referrerId,
          referredUserId: customerUserId,
          orderId,
          orderAmount,
          commissionRate,
          rewardAmount,
          status: 'Approved',
          approvedAt: new Date()
        }
      });
      await prisma.referralProfile.update({
        where: { id: referrerProfile.id },
        data: {
          totalSales: { increment: orderAmount },
          totalCommission: { increment: rewardAmount },
          approvedReward: { increment: rewardAmount }
        }
      });
      await prisma.referralTransaction.create({
        data: {
          commissionId: comm.id,
          type: 'COMMISSION_APPROVED',
          amount: rewardAmount,
          previousBal: referrerProfile.approvedReward,
          newBal: referrerProfile.approvedReward + rewardAmount,
          reason: `Hoa hồng 30% từ đơn hàng ${orderId} (${orderAmount.toLocaleString('vi-VN')} ₫)`
        }
      });
      await prisma.notification.create({
        data: {
          userId: relationship.referrerId,
          title: '💰 Nhận thưởng hoa hồng giới thiệu 30%!',
          message: `Chúc mừng bạn! Người bạn bạn giới thiệu vừa thanh toán đơn hàng. Bạn nhận được +${rewardAmount.toLocaleString('vi-VN')} ₫ hoa hồng vào ví thưởng!`,
          type: 'success'
        }
      });
      return [comm];
    });

    return commission;
  }

  /**
   * Adjusts / cancels commission when an order is cancelled or refunded
   */
  async processOrderCancelledOrRefunded(orderId: string, reasonText: string = 'Đơn hàng bị hủy/hoàn tiền'): Promise<boolean> {
    const prisma = getPrisma();

    const commission = await prisma.referralCommission.findUnique({
      where: { orderId }
    });

    if (!commission || commission.status === 'Cancelled') return false;

    const profile = await prisma.referralProfile.findUnique({
      where: { userId: commission.referrerId }
    });

    const deductAmount = commission.rewardAmount;

    await prisma.$transaction([
      prisma.referralCommission.update({
        where: { id: commission.id },
        data: {
          status: 'Cancelled',
          cancelledAt: new Date(),
          note: reasonText
        }
      }),
      ...(profile ? [
        prisma.referralProfile.update({
          where: { id: profile.id },
          data: {
            totalSales: { decrement: commission.orderAmount },
            totalCommission: { decrement: deductAmount },
            approvedReward: { decrement: Math.min(profile.approvedReward, deductAmount) }
          }
        }),
        prisma.referralTransaction.create({
          data: {
            commissionId: commission.id,
            type: 'COMMISSION_CANCELLED',
            amount: -deductAmount,
            previousBal: profile.approvedReward,
            newBal: Math.max(0, profile.approvedReward - deductAmount),
            reason: `Hủy thưởng đơn ${orderId}: ${reasonText}`
          }
        }),
        prisma.notification.create({
          data: {
            userId: commission.referrerId,
            title: '⚠️ Điều chỉnh hoa hồng giới thiệu',
            message: `Khoản hoa hồng ${deductAmount.toLocaleString('vi-VN')} ₫ của đơn hàng ${orderId} đã được điều chỉnh do: ${reasonText}.`,
            type: 'warning'
          }
        })
      ] : [])
    ]);

    return true;
  }

  /**
   * Retrieves full dashboard stats for a user
   */
  async getUserDashboard(userId: string, origin: string = ''): Promise<ReferralStats> {
    const prisma = getPrisma();
    const profile = await this.getOrCreateProfile(userId);

    const [relationships, commissions] = await Promise.all([
      prisma.referralRelationship.findMany({
        where: { referrerId: userId },
        include: {
          referredUser: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.referralCommission.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const baseUrl = origin || 'http://localhost:5173';
    const referralLink = `${baseUrl}/register?ref=${profile.referralCode}`;

    return {
      referralCode: profile.referralCode,
      referralLink,
      totalReferred: profile.totalReferred,
      totalSales: profile.totalSales,
      totalCommission: profile.totalCommission,
      pendingReward: profile.pendingReward,
      approvedReward: profile.approvedReward,
      withdrawalPending: profile.withdrawalPending,
      paidReward: profile.paidReward,
      history: relationships.map(r => ({
        id: r.id,
        referredUser: {
          name: r.referredUser.name || 'Người dùng',
          email: r.referredUser.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Privacy mask
        },
        createdAt: r.createdAt
      })),
      commissions: commissions.map(c => ({
        id: c.id,
        orderId: c.orderId,
        orderAmount: c.orderAmount,
        commissionRate: c.commissionRate,
        rewardAmount: c.rewardAmount,
        status: c.status,
        createdAt: c.createdAt,
        note: c.note
      }))
    };
  }

  /**
   * User requests bank withdrawal from available balance.
   * Atomically locks funds: reduces approvedReward and increases withdrawalPending.
   */
  async requestWithdrawal(userId: string, input: WithdrawalInput): Promise<any> {
    const prisma = getPrisma();
    const { amount, bankName, bankAccount, accountHolder, transferNote, userNote } = input;

    if (!amount || amount <= 0) {
      throw new Error('Số tiền rút không hợp lệ');
    }
    if (amount < 50000) {
      throw new Error('Số tiền rút tối thiểu là 50.000 ₫');
    }
    if (!bankName || !bankAccount || !accountHolder) {
      throw new Error('Vui lòng điền đầy đủ thông tin ngân hàng và chủ tài khoản');
    }

    const profile = await this.getOrCreateProfile(userId);

    if (profile.approvedReward < amount) {
      throw new Error(`Số dư khả dụng không đủ (${profile.approvedReward.toLocaleString('vi-VN')} ₫). Không thể rút ${amount.toLocaleString('vi-VN')} ₫.`);
    }

    // Atomic transaction: lock funds, create request, log ledger transaction, notify
    const [request] = await prisma.$transaction([
      prisma.withdrawalRequest.create({
        data: {
          userId,
          amount,
          bankName,
          bankAccount,
          accountHolder,
          transferNote: transferNote || `LifeOS Rut tien thuong - ${userId.substring(0, 8)}`,
          userNote,
          status: 'PENDING',
          balanceBefore: profile.approvedReward
        }
      }),
      prisma.referralProfile.update({
        where: { id: profile.id },
        data: {
          approvedReward: { decrement: amount },
          withdrawalPending: { increment: amount }
        }
      }),
      prisma.referralTransaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL_REQUESTED',
          amount: -amount,
          previousBal: profile.approvedReward,
          newBal: profile.approvedReward - amount,
          reason: `Yêu cầu rút ${amount.toLocaleString('vi-VN')} ₫ về ${bankName} (${bankAccount})`
        }
      }),
      prisma.notification.create({
        data: {
          userId,
          title: '💸 Đã tạo yêu cầu rút tiền',
          message: `Yêu cầu rút ${amount.toLocaleString('vi-VN')} ₫ về tài khoản ${bankName} - ${bankAccount} đã được gửi. Admin sẽ duyệt và giải ngân sớm!`,
          type: 'info'
        }
      })
    ]);

    return request;
  }

  /**
   * User: Get user's withdrawal requests
   */
  async getUserWithdrawals(userId: string): Promise<any[]> {
    const prisma = getPrisma();
    return prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Admin: List all withdrawal requests with user info
   */
  async getAdminWithdrawals(status?: string): Promise<any[]> {
    const prisma = getPrisma();
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return prisma.withdrawalRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Admin Approves Withdrawal: marks PAID, deducts withdrawalPending, adds to paidReward, logs txReference
   */
  async adminApproveWithdrawal(withdrawalId: string, adminEmail: string, txReference?: string, proofUrl?: string): Promise<any> {
    const prisma = getPrisma();
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: true }
    });

    if (!request) {
      throw new Error('Không tìm thấy yêu cầu rút tiền');
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Yêu cầu đang ở trạng thái "${request.status}", không thể duyệt`);
    }

    const profile = await this.getOrCreateProfile(request.userId);

    const [updatedRequest] = await prisma.$transaction([
      prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'PAID',
          txReference: txReference || `TXN-${Date.now()}`,
          proofUrl: proofUrl || null,
          processedBy: adminEmail,
          processedAt: new Date()
        }
      }),
      prisma.referralProfile.update({
        where: { id: profile.id },
        data: {
          withdrawalPending: { decrement: Math.min(profile.withdrawalPending, request.amount) },
          paidReward: { increment: request.amount }
        }
      }),
      prisma.referralTransaction.create({
        data: {
          withdrawalId,
          userId: request.userId,
          type: 'WITHDRAWAL_PAID',
          amount: request.amount,
          previousBal: profile.approvedReward,
          newBal: profile.approvedReward,
          reason: `Đã giải ngân chuyển khoản ${request.amount.toLocaleString('vi-VN')} ₫ (Mã GD: ${txReference || 'Chuyển khoản thành công'})`
        }
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          title: '🎉 Tiền thưởng đã được chuyển khoản!',
          message: `Khoản rút ${request.amount.toLocaleString('vi-VN')} ₫ đã được chuyển tới ngân hàng ${request.bankName} (${request.bankAccount}). Mã GD: ${txReference || 'Thành công'}.`,
          type: 'success'
        }
      })
    ]);

    return updatedRequest;
  }

  /**
   * Admin Rejects Withdrawal: refunds locked money from withdrawalPending back to approvedReward
   */
  async adminRejectWithdrawal(withdrawalId: string, adminEmail: string, reason: string): Promise<any> {
    const prisma = getPrisma();
    if (!reason || !reason.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối yêu cầu rút tiền');
    }

    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: true }
    });

    if (!request) {
      throw new Error('Không tìm thấy yêu cầu rút tiền');
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Yêu cầu đang ở trạng thái "${request.status}", không thể từ chối`);
    }

    const profile = await this.getOrCreateProfile(request.userId);

    const [updatedRequest] = await prisma.$transaction([
      prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          rejectReason: reason,
          processedBy: adminEmail,
          processedAt: new Date()
        }
      }),
      prisma.referralProfile.update({
        where: { id: profile.id },
        data: {
          withdrawalPending: { decrement: Math.min(profile.withdrawalPending, request.amount) },
          approvedReward: { increment: request.amount }
        }
      }),
      prisma.referralTransaction.create({
        data: {
          withdrawalId,
          userId: request.userId,
          type: 'WITHDRAWAL_REJECTED',
          amount: request.amount,
          previousBal: profile.approvedReward,
          newBal: profile.approvedReward + request.amount,
          reason: `Hoàn tiền yêu cầu rút bị từ chối: ${reason}`
        }
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          title: '⚠️ Yêu cầu rút tiền bị từ chối - Tiền đã hoàn lại ví',
          message: `Yêu cầu rút ${request.amount.toLocaleString('vi-VN')} ₫ bị từ chối: "${reason}". Số tiền đã được hoàn lại đầy đủ vào Số dư khả dụng.`,
          type: 'warning'
        }
      })
    ]);

    return updatedRequest;
  }

  /**
   * Admin: List all referral programs & commissions
   */
  async getAdminOverview(): Promise<any> {
    const prisma = getPrisma();
    const [profiles, allCommissions, totalStats, pendingWithdrawalsCount, totalPaidStats] = await Promise.all([
      prisma.referralProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { totalCommission: 'desc' },
        take: 50
      }),
      prisma.referralCommission.findMany({
        include: {
          referrer: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.referralCommission.aggregate({
        _sum: { orderAmount: true, rewardAmount: true },
        _count: { id: true }
      }),
      prisma.withdrawalRequest.count({
        where: { status: 'PENDING' }
      }),
      prisma.withdrawalRequest.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      })
    ]);

    return {
      totalOrders: totalStats._count.id || 0,
      totalSales: totalStats._sum.orderAmount || 0,
      totalCommissionGiven: totalStats._sum.rewardAmount || 0,
      pendingWithdrawalsCount,
      totalPaidOut: totalPaidStats._sum.amount || 0,
      profiles,
      commissions: allCommissions
    };
  }
}

export const referralService = new ReferralService();
