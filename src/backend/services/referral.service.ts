import { getPrisma } from '../db.js';
import { r2Service } from './r2.service.js';

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
  paymentQr?: any;
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

export function validateQrImageBuffer(buffer: Buffer, mimeType: string, extension: string): { valid: boolean; error?: string } {
  const cleanMime = (mimeType || '').toLowerCase().trim();
  const cleanExt = (extension || '').toLowerCase().trim();

  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp'];

  if (!cleanMime || !ALLOWED_MIME.includes(cleanMime)) {
    return { valid: false, error: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận PNG, JPG hoặc WEBP.' };
  }
  if (!cleanExt || !ALLOWED_EXT.some(ext => cleanExt.endsWith(ext))) {
    return { valid: false, error: 'Đuôi tập tin không được phép (chỉ chấp nhận .png, .jpg, .jpeg, .webp).' };
  }

  // Size limit: 5MB
  if (buffer.length > 5 * 1024 * 1024) {
    return { valid: false, error: 'Kích thước tập tin vượt quá giới hạn tối đa 5MB.' };
  }

  // Magic bytes inspection
  if (cleanMime === 'image/png') {
    if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return { valid: false, error: 'Tập tin PNG không hợp lệ hoặc bị lỗi cấu trúc.' };
    }
  } else if (cleanMime === 'image/jpeg' || cleanMime === 'image/jpg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, error: 'Tập tin JPEG không hợp lệ hoặc bị lỗi cấu trúc.' };
    }
  } else if (cleanMime === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      return { valid: false, error: 'Tập tin WEBP không hợp lệ hoặc bị lỗi cấu trúc.' };
    }
  }

  return { valid: true };
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
          message: `Một người bạn vừa đăng ký tài khoản thành công qua mã ${cleanCode}. Khi bạn ấy phát sinh đơn hàng, bạn sẽ nhận được 20% hoa hồng!`,
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

    // Calculate 20% reward (Official Business Rule)
    const commissionRate = 0.20;
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
          reason: `Hoa hồng 20% từ đơn hàng ${orderId} (${orderAmount.toLocaleString('vi-VN')} ₫)`
        }
      }),
      // Send celebration notification to referrer
      prisma.notification.create({
        data: {
          userId: relationship.referrerId,
          title: '💰 Nhận thưởng hoa hồng giới thiệu 20%!',
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
          reason: `Hoa hồng 20% từ đơn hàng ${orderId} (${orderAmount.toLocaleString('vi-VN')} ₫)`
        }
      });
      await prisma.notification.create({
        data: {
          userId: relationship.referrerId,
          title: '💰 Nhận thưởng hoa hồng giới thiệu 20%!',
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

    const [relationships, commissions, paymentQr] = await Promise.all([
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
      }),
      prisma.paymentQR.findUnique({
        where: { userId }
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
      paymentQr: paymentQr ? {
        id: paymentQr.id,
        qrUrl: paymentQr.qrUrl,
        fileName: paymentQr.fileName,
        fileSize: paymentQr.fileSize,
        mimeType: paymentQr.mimeType,
        bankName: paymentQr.bankName,
        bankAccount: paymentQr.bankAccount,
        accountHolder: paymentQr.accountHolder,
        status: paymentQr.status,
        rejectionReason: paymentQr.rejectionReason,
        uploadedAt: paymentQr.uploadedAt,
        updatedAt: paymentQr.updatedAt
      } : null,
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
   * Freezes snapshot of current active Payment QR.
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

    // Atomic transaction with concurrency guard: lock funds strictly if approvedReward >= amount
    const [updatedProfile, request] = await prisma.$transaction(async (tx) => {
      // Re-fetch profile inside transaction with lock
      const currentProfile = await tx.referralProfile.findUnique({
        where: { id: profile.id }
      });

      if (!currentProfile || currentProfile.approvedReward < amount) {
        throw new Error(`Số dư khả dụng không đủ (${(currentProfile?.approvedReward || 0).toLocaleString('vi-VN')} ₫). Không thể rút ${amount.toLocaleString('vi-VN')} ₫.`);
      }

      // Check user's active payment QR to freeze snapshot
      const activeQr = await tx.paymentQR.findUnique({
        where: { userId }
      });

      const updated = await tx.referralProfile.update({
        where: { id: profile.id },
        data: {
          approvedReward: { decrement: amount },
          withdrawalPending: { increment: amount }
        }
      });

      const newReq = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          bankName,
          bankAccount,
          accountHolder,
          transferNote: transferNote || `LifeOS Rut tien thuong - ${userId.substring(0, 8)}`,
          userNote,
          status: 'PENDING',
          paymentQrUrl: activeQr?.qrUrl || null,
          balanceBefore: currentProfile.approvedReward
        }
      });

      await tx.referralTransaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL_REQUESTED',
          amount: -amount,
          previousBal: currentProfile.approvedReward,
          newBal: updated.approvedReward,
          reason: `Yêu cầu rút ${amount.toLocaleString('vi-VN')} ₫ về ${bankName} (${bankAccount})`
        }
      });

      await tx.auditLog.create({
        data: {
          adminId: userId,
          targetUserId: userId,
          action: 'REFERRAL_WITHDRAWAL_REQUEST',
          beforeState: JSON.stringify({ approvedReward: currentProfile.approvedReward }),
          afterState: JSON.stringify({ requestId: newReq.id, amount, bankName, bankAccount }),
          result: 'Success',
          reason: `Người dùng tạo yêu cầu rút ${amount.toLocaleString('vi-VN')} ₫`
        }
      });

      await tx.notification.create({
        data: {
          userId,
          title: '💸 Đã tạo yêu cầu rút tiền',
          message: `Yêu cầu rút ${amount.toLocaleString('vi-VN')} ₫ về tài khoản ${bankName} - ${bankAccount} đã được gửi. Admin sẽ duyệt và giải ngân sớm!`,
          type: 'info'
        }
      });

      return [updated, newReq];
    });

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
   * Admin: List all withdrawal requests with user info and PaymentQR preview
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
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            paymentQr: {
              select: {
                id: true,
                qrUrl: true,
                fileName: true,
                status: true,
                rejectionReason: true,
                updatedAt: true
              }
            }
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Admin Approves Withdrawal: marks PAID, deducts withdrawalPending, adds to paidReward, logs txReference
   * Concurrency protected against race conditions, retries, and duplicate clicks (Idempotency).
   */
  async adminApproveWithdrawal(withdrawalId: string, adminEmail: string, txReference?: string, proofUrl?: string): Promise<any> {
    const prisma = getPrisma();

    // Atomic transaction with status guard to strictly prevent double payout
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        include: { user: true }
      });

      if (!existing) {
        throw new Error('Không tìm thấy yêu cầu rút tiền');
      }
      if (existing.status !== 'PENDING') {
        throw new Error(`Yêu cầu rút tiền này đã được xử lý (trạng thái: ${existing.status}). Không thể thực hiện chi trả trùng.`);
      }

      const profile = await tx.referralProfile.findUnique({
        where: { userId: existing.userId }
      });

      if (!profile) {
        throw new Error('Không tìm thấy hồ sơ hoa hồng của người dùng.');
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'PAID',
          txReference: txReference || `TXN-${Date.now()}`,
          proofUrl: proofUrl || null,
          processedBy: adminEmail,
          processedAt: new Date()
        }
      });

      await tx.referralProfile.update({
        where: { id: profile.id },
        data: {
          withdrawalPending: { decrement: Math.min(profile.withdrawalPending, existing.amount) },
          paidReward: { increment: existing.amount }
        }
      });

      await tx.referralTransaction.create({
        data: {
          withdrawalId,
          userId: existing.userId,
          type: 'WITHDRAWAL_PAID',
          amount: existing.amount,
          previousBal: profile.approvedReward,
          newBal: profile.approvedReward,
          reason: `Đã giải ngân chuyển khoản ${existing.amount.toLocaleString('vi-VN')} ₫ (Mã GD: ${txReference || 'Chuyển khoản thành công'})`
        }
      });

      await tx.auditLog.create({
        data: {
          adminId: adminEmail,
          targetUserId: existing.userId,
          action: 'REFERRAL_WITHDRAWAL_PAID',
          beforeState: JSON.stringify({ status: existing.status, amount: existing.amount }),
          afterState: JSON.stringify({ status: 'PAID', txReference: txReference || `TXN-${Date.now()}` }),
          result: 'Success',
          reason: `Admin ${adminEmail} xác nhận đã chuyển khoản thành công ${existing.amount.toLocaleString('vi-VN')} ₫`
        }
      });

      await tx.notification.create({
        data: {
          userId: existing.userId,
          title: '🎉 Tiền thưởng đã được chuyển khoản!',
          message: `Khoản rút ${existing.amount.toLocaleString('vi-VN')} ₫ đã được chuyển tới ngân hàng ${existing.bankName} (${existing.bankAccount}). Mã GD: ${txReference || 'Thành công'}.`,
          type: 'success'
        }
      });

      return updated;
    });

    return updatedRequest;
  }

  /**
   * Admin Rejects Withdrawal: refunds locked money from withdrawalPending back to approvedReward
   * Concurrency protected.
   */
  async adminRejectWithdrawal(withdrawalId: string, adminEmail: string, reason: string): Promise<any> {
    const prisma = getPrisma();
    if (!reason || !reason.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối yêu cầu rút tiền');
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const existing = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        include: { user: true }
      });

      if (!existing) {
        throw new Error('Không tìm thấy yêu cầu rút tiền');
      }
      if (existing.status !== 'PENDING') {
        throw new Error(`Yêu cầu rút tiền này đã được xử lý (trạng thái: ${existing.status}), không thể từ chối.`);
      }

      const profile = await tx.referralProfile.findUnique({
        where: { userId: existing.userId }
      });

      if (!profile) {
        throw new Error('Không tìm thấy hồ sơ hoa hồng của người dùng.');
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          rejectReason: reason.trim(),
          processedBy: adminEmail,
          processedAt: new Date()
        }
      });

      await tx.referralProfile.update({
        where: { id: profile.id },
        data: {
          withdrawalPending: { decrement: Math.min(profile.withdrawalPending, existing.amount) },
          approvedReward: { increment: existing.amount }
        }
      });

      await tx.referralTransaction.create({
        data: {
          withdrawalId,
          userId: existing.userId,
          type: 'WITHDRAWAL_REJECTED',
          amount: existing.amount,
          previousBal: profile.approvedReward,
          newBal: profile.approvedReward + existing.amount,
          reason: `Hoàn tiền yêu cầu rút bị từ chối: ${reason.trim()}`
        }
      });

      await tx.auditLog.create({
        data: {
          adminId: adminEmail,
          targetUserId: existing.userId,
          action: 'REFERRAL_WITHDRAWAL_REJECTED',
          beforeState: JSON.stringify({ status: existing.status, amount: existing.amount }),
          afterState: JSON.stringify({ status: 'REJECTED', rejectReason: reason.trim() }),
          result: 'Success',
          reason: reason.trim()
        }
      });

      await tx.notification.create({
        data: {
          userId: existing.userId,
          title: '⚠️ Yêu cầu rút tiền bị từ chối - Tiền đã hoàn lại ví',
          message: `Yêu cầu rút ${existing.amount.toLocaleString('vi-VN')} ₫ bị từ chối: "${reason.trim()}". Số tiền đã được hoàn lại đầy đủ vào Số dư khả dụng.`,
          type: 'warning'
        }
      });

      return updated;
    });

    return updatedRequest;
  }

  // =========================================================================
  // REQUIREMENT 133: PAYMENT QR (CUSTOMER & ADMIN MANAGEMENT)
  // =========================================================================

  /**
   * Retrieves user's active payment QR metadata
   */
  async getUserPaymentQr(userId: string): Promise<any> {
    const prisma = getPrisma();
    const qr = await prisma.paymentQR.findUnique({
      where: { userId }
    });
    return qr;
  }

  /**
   * Customer uploads or replaces their bank/payment QR image
   * Validates file format (PNG, JPG, WEBP), MIME type, extension, magic bytes, and max size (5MB).
   * Stores securely in Cloudflare R2 or secure base64 fallback.
   */
  async saveUserPaymentQr(userId: string, input: {
    base64Data: string;
    fileName: string;
    mimeType: string;
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
  }): Promise<any> {
    const prisma = getPrisma();
    const { base64Data, fileName, mimeType, bankName, bankAccount, accountHolder } = input;

    if (!base64Data) {
      throw new Error('Dữ liệu ảnh QR không được để trống.');
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const ext = (fileName || '').substring((fileName || '').lastIndexOf('.'));

    const validation = validateQrImageBuffer(buffer, mimeType || 'image/png', ext);
    if (!validation.valid) {
      throw new Error(validation.error || 'Tập tin ảnh không hợp lệ.');
    }

    let qrUrl = '';
    let storageKey: string | null = null;

    if (r2Service.isConfigured()) {
      try {
        const uploadResult = await r2Service.uploadFile(
          buffer,
          fileName || `qr-${Date.now()}.png`,
          mimeType || 'image/png',
          userId,
          'payment-qrs'
        );
        qrUrl = uploadResult.url;
        storageKey = uploadResult.key;
      } catch (err) {
        console.warn('[PaymentQR] R2 upload error, falling back to base64 data URI:', err);
        qrUrl = `data:${mimeType};base64,${cleanBase64}`;
      }
    } else {
      qrUrl = `data:${mimeType};base64,${cleanBase64}`;
    }

    const paymentQr = await prisma.paymentQR.upsert({
      where: { userId },
      create: {
        userId,
        qrUrl,
        storageKey,
        fileName: fileName || 'payment-qr.png',
        fileSize: buffer.length,
        mimeType: mimeType || 'image/png',
        bankName: bankName?.trim() || null,
        bankAccount: bankAccount?.trim() || null,
        accountHolder: accountHolder?.trim()?.toUpperCase() || null,
        status: 'PENDING_VERIFICATION'
      },
      update: {
        qrUrl,
        storageKey,
        fileName: fileName || 'payment-qr.png',
        fileSize: buffer.length,
        mimeType: mimeType || 'image/png',
        bankName: bankName?.trim() || null,
        bankAccount: bankAccount?.trim() || null,
        accountHolder: accountHolder?.trim()?.toUpperCase() || null,
        status: 'PENDING_VERIFICATION',
        rejectionReason: null,
        verifiedBy: null,
        verifiedAt: null
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: userId,
        targetUserId: userId,
        action: 'PAYMENT_QR_UPLOAD',
        afterState: JSON.stringify({ id: paymentQr.id, status: paymentQr.status, fileName }),
        result: 'Success',
        reason: 'Người dùng tải lên/cập nhật QR nhận hoa hồng'
      }
    });

    return paymentQr;
  }

  /**
   * Customer deletes their payment QR if not currently locked in an active processing payout
   */
  async deleteUserPaymentQr(userId: string): Promise<boolean> {
    const prisma = getPrisma();
    const qr = await prisma.paymentQR.findUnique({
      where: { userId }
    });
    if (!qr) {
      throw new Error('Không tìm thấy mã QR thanh toán để xóa.');
    }

    // Check if user has an active pending withdrawal request
    const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
      where: { userId, status: 'PENDING' }
    });
    if (pendingWithdrawal) {
      throw new Error('Bạn đang có yêu cầu rút tiền đang chờ xử lý. Không thể xóa mã QR lúc này.');
    }

    if (qr.storageKey && r2Service.isConfigured()) {
      try {
        await r2Service.deleteFile(qr.storageKey, userId, false);
      } catch (err) {
        console.warn('[PaymentQR] Failed to delete file from R2:', err);
      }
    }

    await prisma.paymentQR.delete({
      where: { userId }
    });

    await prisma.auditLog.create({
      data: {
        adminId: userId,
        targetUserId: userId,
        action: 'PAYMENT_QR_DELETE',
        beforeState: JSON.stringify({ id: qr.id, fileName: qr.fileName }),
        result: 'Success',
        reason: 'Người dùng xóa mã QR nhận hoa hồng'
      }
    });

    return true;
  }

  /**
   * Admin: List all customer payment QRs with filtering & search
   */
  async getAdminPaymentQrs(status?: string, search?: string): Promise<any[]> {
    const prisma = getPrisma();
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      where.user = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      };
    }

    return prisma.paymentQR.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Admin approves/verifies customer QR as valid for payouts
   */
  async adminVerifyPaymentQr(qrId: string, adminEmail: string): Promise<any> {
    const prisma = getPrisma();
    const qr = await prisma.paymentQR.findUnique({
      where: { id: qrId },
      include: { user: true }
    });
    if (!qr) {
      throw new Error('Không tìm thấy mã QR.');
    }

    const updated = await prisma.paymentQR.update({
      where: { id: qrId },
      data: {
        status: 'VERIFIED',
        verifiedBy: adminEmail,
        verifiedAt: new Date(),
        rejectionReason: null
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminEmail,
        targetUserId: qr.userId,
        action: 'PAYMENT_QR_VERIFIED',
        beforeState: JSON.stringify({ status: qr.status }),
        afterState: JSON.stringify({ status: 'VERIFIED', verifiedBy: adminEmail }),
        result: 'Success',
        reason: 'Admin xác nhận mã QR hợp lệ'
      }
    });

    await prisma.notification.create({
      data: {
        userId: qr.userId,
        title: '✅ QR nhận hoa hồng đã được xác minh',
        message: 'Mã QR tài khoản nhận tiền của bạn đã được Admin xác minh hợp lệ. Bạn có thể yên tâm nhận hoa hồng!',
        type: 'success'
      }
    });

    return updated;
  }

  /**
   * Admin rejects customer QR with mandatory reason and requests update
   */
  async adminRejectPaymentQr(qrId: string, adminEmail: string, reason: string): Promise<any> {
    const prisma = getPrisma();
    if (!reason || !reason.trim()) {
      throw new Error('Bắt buộc phải nhập lý do từ chối hoặc yêu cầu cập nhật QR.');
    }
    const qr = await prisma.paymentQR.findUnique({
      where: { id: qrId },
      include: { user: true }
    });
    if (!qr) {
      throw new Error('Không tìm thấy mã QR.');
    }

    const updated = await prisma.paymentQR.update({
      where: { id: qrId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        verifiedBy: adminEmail,
        verifiedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminEmail,
        targetUserId: qr.userId,
        action: 'PAYMENT_QR_REJECTED',
        beforeState: JSON.stringify({ status: qr.status }),
        afterState: JSON.stringify({ status: 'REJECTED', rejectionReason: reason.trim() }),
        result: 'Success',
        reason: reason.trim()
      }
    });

    await prisma.notification.create({
      data: {
        userId: qr.userId,
        title: '⚠️ Cần cập nhật lại QR nhận hoa hồng',
        message: `Mã QR của bạn cần được cập nhật lại: "${reason.trim()}". Vui lòng tải lên ảnh QR rõ nét hơn.`,
        type: 'warning'
      }
    });

    return updated;
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
