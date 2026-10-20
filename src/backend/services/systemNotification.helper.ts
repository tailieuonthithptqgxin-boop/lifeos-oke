import { emailQueueService } from './emailQueue.service.js';
import { buildEmailHtml } from './emailTemplate.service.js';
import { getAppBaseUrl, gmailService } from './gmailNotification.service.js';
import { getPrisma } from '../db.js';

export class SystemNotificationHelper {
  private static async getAdminEmails(): Promise<string[]> {
    try {
      const envAdmin = (process.env.ADMIN_NOTIFY_EMAIL || process.env.INITIAL_ADMIN_EMAIL || '').trim();
      const prisma = getPrisma();
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, status: 'ACTIVE' },
        select: { email: true }
      });
      const emails = new Set<string>();
      if (envAdmin && envAdmin.includes('@')) emails.add(envAdmin);
      for (const u of adminUsers) {
        if (u.email && u.email.includes('@')) emails.add(u.email);
      }
      return Array.from(emails);
    } catch {
      return [process.env.ADMIN_NOTIFY_EMAIL || 'admin@lifeos.com'];
    }
  }

  /**
   * 1. Khi người dùng mới đăng ký tài khoản
   */
  static async onUserRegistered(user: { id: string; name: string; email: string }, ip?: string) {
    const appUrl = getAppBaseUrl();

    // 1A. Email Chào mừng gửi cho Người dùng mới
    const userHtml = buildEmailHtml({
      headline: 'Chào mừng bạn đến với LifeOS!',
      recipientName: user.name,
      badgeText: 'ĐĂNG KÝ THÀNH CÔNG',
      badgeColor: '#10b981',
      summary: 'Tài khoản LifeOS của bạn đã được khởi tạo thành công. Bạn có thể bắt đầu thiết lập mục tiêu, quản lý công việc và tối ưu hóa nhịp sống của mình ngay hôm nay.',
      details: [
        { label: 'Họ và tên', value: user.name },
        { label: 'Email tài khoản', value: user.email },
        { label: 'Gói cước ban đầu', value: 'Bản Dùng Thử / Miễn Phí (Preview)' },
        { label: 'Thời gian đăng ký', value: new Date().toLocaleString('vi-VN') }
      ],
      actionLabel: 'Mở Không Gian Làm Việc',
      actionUrl: `${appUrl}/?view=dashboard`,
      footerNote: 'Nếu bạn cần nâng cấp gói để mở khóa toàn diện tính năng, vui lòng quét mã VietQR tại trang Gói Cước.'
    });

    await emailQueueService.enqueue({
      recipient: user.email,
      subject: '🎉 Chào mừng bạn gia nhập LifeOS — Hệ Điều Hành Cuộc Sống Thế Hệ Mới',
      htmlBody: userHtml,
      eventType: 'AUTH_REGISTER_USER',
      metadata: { userId: user.id }
    }).catch(err => console.error('[Notification] Error enqueuing user welcome mail:', err));

    // 1B. Email Báo Cáo gửi cho Quản Trị Viên (Admin)
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: 'Có Người Dùng Mới Vừa Đăng Ký Tài Khoản',
        badgeText: 'THÀNH VIÊN MỚI',
        badgeColor: '#6366f1',
        summary: `Hệ thống vừa ghi nhận một thành viên mới đăng ký tài khoản trên nền tảng LifeOS.`,
        details: [
          { label: 'Tên thành viên', value: user.name },
          { label: 'Địa chỉ Email', value: user.email },
          { label: 'Mã người dùng', value: user.id },
          { label: 'Địa chỉ IP', value: ip || 'Không xác định' },
          { label: 'Thời gian đăng ký', value: new Date().toLocaleString('vi-VN') }
        ],
        actionLabel: 'Xem Quản Trị Người Dùng',
        actionUrl: `${appUrl}/?view=admin&tab=users`,
        priority: 'NORMAL'
      });

      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `👤 [LifeOS] Thành viên mới đăng ký: ${user.name} (${user.email})`,
        htmlBody: adminHtml,
        eventType: 'ADMIN_ALERT_NEW_USER',
        metadata: { userId: user.id }
      }).catch(err => console.error('[Notification] Error enqueuing admin new user mail:', err));
    }
  }

  /**
   * 2. Khi khách hàng gửi yêu cầu thanh toán (báo đã chuyển khoản)
   */
  static async onPaymentRequested(payment: {
    id: string;
    orderId: string;
    txReference?: string;
    amount: number;
    planRequested: string;
    billingCycle?: string;
    userEmail: string;
    userName?: string;
    note?: string;
  }) {
    const appUrl = getAppBaseUrl();

    // 2A. Email gửi cho Khách hàng: Xác nhận đã nhận thông tin chuyển khoản
    const customerHtml = buildEmailHtml({
      headline: 'Đã Tiếp Nhận Thông Tin Chuyển Khoản Gói Cước',
      recipientName: payment.userName || payment.userEmail,
      badgeText: 'ĐANG XỬ LÝ THANH TOÁN',
      badgeColor: '#f59e0b',
      summary: `Chúng tôi đã tiếp nhận thông tin chuyển khoản của bạn cho gói cước <strong>${payment.planRequested}</strong>. Đội ngũ quản trị viên sẽ đối soát và kích hoạt gói cước cho bạn trong thời gian sớm nhất (thường từ 5 - 15 phút).`,
      details: [
        { label: 'Mã đơn hàng', value: payment.orderId },
        { label: 'Mã tham chiếu GD', value: payment.txReference || payment.orderId },
        { label: 'Gói cước yêu cầu', value: `${payment.planRequested} (${payment.billingCycle || 'Theo tháng'})` },
        { label: 'Số tiền thanh toán', value: `${payment.amount.toLocaleString('vi-VN')} ₫` },
        { label: 'Trạng thái', value: 'Chờ Quản trị viên duyệt (Pending)' }
      ],
      actionLabel: 'Kiểm Tra Trạng Thái Đơn Hàng',
      actionUrl: `${appUrl}/?view=subscriptions`,
      footerNote: 'Ngay khi thanh toán được duyệt thành công, bạn sẽ nhận được email thông báo kích hoạt bản quyền.'
    });

    await emailQueueService.enqueue({
      recipient: payment.userEmail,
      subject: `📋 [LifeOS] Xác nhận tiếp nhận thanh toán gói ${payment.planRequested} (${payment.orderId})`,
      htmlBody: customerHtml,
      eventType: 'PAYMENT_SUBMITTED_CUSTOMER',
      metadata: { orderId: payment.orderId, amount: payment.amount }
    }).catch(err => console.error('[Notification] Error enqueuing customer payment submitted mail:', err));

    // 2B. Email gửi cho Admin: Báo có đơn hàng mới cần duyệt NGAY LẬP TỨC
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: 'Yêu Cầu Thanh Toán Gói Cước Mới Cần Duyệt',
        badgeText: 'DUYỆT THANH TOÁN',
        badgeColor: '#ef4444',
        priority: 'HIGH',
        summary: `Khách hàng <strong>${payment.userEmail}</strong> vừa bấm xác nhận đã chuyển khoản thành công. Vui lòng kiểm tra tài khoản ngân hàng và duyệt đơn.`,
        details: [
          { label: 'Mã đơn hàng', value: payment.orderId },
          { label: 'Khách hàng', value: `${payment.userName || ''} (${payment.userEmail})` },
          { label: 'Gói đăng ký', value: `${payment.planRequested} (${payment.billingCycle || ''})` },
          { label: 'Số tiền cần kiểm tra', value: `${payment.amount.toLocaleString('vi-VN')} ₫` },
          { label: 'Nội dung chuyển khoản', value: payment.txReference || payment.orderId },
          { label: 'Ghi chú thêm', value: payment.note || 'Không có' }
        ],
        actionLabel: 'Mở Trang Duyệt Thanh Toán',
        actionUrl: `${appUrl}/?view=admin&tab=payment_requests`,
        footerNote: 'Vui lòng kiểm tra sao kê ngân hàng chính xác trước khi bấm "Xác nhận duyệt".'
      });

      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `💰 [DUYỆT GẤP] Thanh toán mới ${payment.amount.toLocaleString('vi-VN')} ₫ từ ${payment.userEmail}`,
        htmlBody: adminHtml,
        eventType: 'ADMIN_ALERT_PAYMENT_PENDING',
        priority: 'HIGH',
        metadata: { orderId: payment.orderId, amount: payment.amount }
      }).catch(err => console.error('[Notification] Error enqueuing admin payment pending mail:', err));
    }
  }

  /**
   * 3. Khi Admin duyệt thành công đơn thanh toán
   */
  static async onPaymentApproved(payment: {
    orderId: string;
    txReference?: string;
    amount: number;
    planName: string;
    expiresAt?: Date | string;
    userEmail: string;
    userName?: string;
  }) {
    const appUrl = getAppBaseUrl();
    const expiryStr = payment.expiresAt ? new Date(payment.expiresAt).toLocaleDateString('vi-VN') : 'Vĩnh viễn';

    const customerHtml = buildEmailHtml({
      headline: `Chúc Mừng! Gói Cước ${payment.planName} Đã Được Kích Hoạt`,
      recipientName: payment.userName || payment.userEmail,
      badgeText: 'KÍCH HOẠT THÀNH CÔNG',
      badgeColor: '#10b981',
      summary: `Quản trị viên đã xác nhận thanh toán của bạn. Tài khoản LifeOS đã được nâng cấp chính thức lên gói <strong>${payment.planName}</strong> với đầy đủ quyền truy cập cao cấp.`,
      details: [
        { label: 'Mã đơn hàng', value: payment.orderId },
        { label: 'Gói dịch vụ', value: payment.planName },
        { label: 'Số tiền thanh toán', value: `${(payment.amount || 0).toLocaleString('vi-VN')} ₫` },
        { label: 'Thời hạn bản quyền', value: `Đến ngày ${expiryStr}` },
        { label: 'Trạng thái tài khoản', value: 'HOẠT ĐỘNG (PRO / ACTIVE)' }
      ],
      actionLabel: 'Bắt Đầu Trải Nghiệm Ngay',
      actionUrl: `${appUrl}/?view=dashboard`,
      footerNote: 'Cảm ơn bạn đã tin tưởng sử dụng LifeOS làm hệ điều hành nâng tầm cuộc sống!'
    });

    await emailQueueService.enqueue({
      recipient: payment.userEmail,
      subject: `🎉 [LifeOS] Kích hoạt thành công gói cước ${payment.planName} của bạn`,
      htmlBody: customerHtml,
      eventType: 'PAYMENT_APPROVED_CUSTOMER',
      priority: 'HIGH',
      metadata: { orderId: payment.orderId }
    }).catch(err => console.error('[Notification] Error enqueuing payment approved mail:', err));
  }

  /**
   * 4. Khi Admin từ chối đơn thanh toán
   */
  static async onPaymentRejected(payment: {
    orderId: string;
    txReference?: string;
    amount: number;
    planName: string;
    userEmail: string;
    userName?: string;
    reason: string;
  }) {
    const appUrl = getAppBaseUrl();

    const customerHtml = buildEmailHtml({
      headline: 'Thông Báo Về Giao Dịch Thanh Toán Gói Cước',
      recipientName: payment.userName || payment.userEmail,
      badgeText: 'CHƯA ĐƯỢC DUYỆT',
      badgeColor: '#ef4444',
      summary: `Đơn thanh toán gói <strong>${payment.planName}</strong> của bạn chưa thể xác nhận thành công do lý do sau: <em>"${payment.reason}"</em>.`,
      details: [
        { label: 'Mã đơn hàng', value: payment.orderId },
        { label: 'Số tiền', value: `${(payment.amount || 0).toLocaleString('vi-VN')} ₫` },
        { label: 'Lý do từ chối', value: payment.reason },
        { label: 'Hướng xử lý', value: 'Vui lòng kiểm tra lại giao dịch hoặc gửi mã sao kê cho ban quản trị' }
      ],
      actionLabel: 'Thực Hiện Lại Thanh Toán',
      actionUrl: `${appUrl}/?view=subscriptions`,
      footerNote: 'Nếu bạn đã chuyển khoản thành công nhưng bị từ chối, vui lòng liên hệ trực tiếp bộ phận hỗ trợ.'
    });

    await emailQueueService.enqueue({
      recipient: payment.userEmail,
      subject: `⚠️ [LifeOS] Thông tin về đơn thanh toán ${payment.orderId}`,
      htmlBody: customerHtml,
      eventType: 'PAYMENT_REJECTED_CUSTOMER',
      metadata: { orderId: payment.orderId, reason: payment.reason }
    }).catch(err => console.error('[Notification] Error enqueuing payment rejected mail:', err));
  }

  /**
   * 5. Khi có yêu cầu rút tiền hoa hồng Affiliate / CTV mới
   */
  static async onWithdrawalRequested(withdrawal: {
    id: string;
    amount: number;
    bankName: string;
    bankAccount: string;
    bankHolder: string;
    userEmail: string;
    userName?: string;
  }) {
    const appUrl = getAppBaseUrl();

    // 5A. Email cho Quản trị viên
    const adminEmails = await this.getAdminEmails();
    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: 'Yêu Cầu Rút Tiền Hoa Hồng Cộng Tác Viên Mới',
        badgeText: 'RÚT TIỀN HOA HỒNG',
        badgeColor: '#8b5cf6',
        priority: 'HIGH',
        summary: `Cộng tác viên <strong>${withdrawal.userEmail}</strong> vừa tạo yêu cầu rút số tiền <strong>${withdrawal.amount.toLocaleString('vi-VN')} ₫</strong> hoa hồng tích lũy.`,
        details: [
          { label: 'Mã yêu cầu', value: withdrawal.id },
          { label: 'Cộng tác viên', value: `${withdrawal.userName || ''} (${withdrawal.userEmail})` },
          { label: 'Số tiền rút', value: `${withdrawal.amount.toLocaleString('vi-VN')} ₫` },
          { label: 'Ngân hàng nhận', value: withdrawal.bankName },
          { label: 'Số tài khoản', value: withdrawal.bankAccount },
          { label: 'Chủ tài khoản', value: withdrawal.bankHolder }
        ],
        actionLabel: 'Xem và Xử Lý Yêu Cầu Rút Tiền',
        actionUrl: `${appUrl}/?view=admin&tab=referrals`,
        footerNote: 'Vui lòng kiểm tra số dư hoa hồng hợp lệ trước khi bấm xác nhận chuyển khoản.'
      });

      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `💸 [RÚT TIỀN] Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')} ₫ từ CTV ${withdrawal.userEmail}`,
        htmlBody: adminHtml,
        eventType: 'ADMIN_ALERT_WITHDRAWAL_REQUEST',
        priority: 'HIGH',
        metadata: { withdrawalId: withdrawal.id }
      }).catch(err => console.error('[Notification] Error enqueuing admin withdrawal mail:', err));
    }
  }

  /**
   * 6. Khi người dùng gửi Phản hồi / Báo lỗi / Hỗ trợ
   */
  static async onFeedbackSubmitted(feedback: {
    id: string;
    category: string;
    subject: string;
    message: string;
    userEmail: string;
    userName?: string;
  }) {
    const appUrl = getAppBaseUrl();
    const adminEmails = await this.getAdminEmails();

    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: 'Phản Hồi / Đóng Góp Ý Kiến Mới Từ Người Dùng',
        badgeText: 'GÓP Ý & BÁO LỖI',
        badgeColor: '#0ea5e9',
        summary: `Người dùng <strong>${feedback.userEmail}</strong> vừa gửi một phản hồi mới về hệ thống.`,
        details: [
          { label: 'Người gửi', value: `${feedback.userName || ''} (${feedback.userEmail})` },
          { label: 'Danh mục', value: feedback.category },
          { label: 'Tiêu đề', value: feedback.subject },
          { label: 'Nội dung phản hồi', value: feedback.message.slice(0, 300) }
        ],
        actionLabel: 'Mở Danh Sách Phản Hồi',
        actionUrl: `${appUrl}/?view=admin&tab=feedbacks`
      });

      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `💬 [Góp ý] [${feedback.category}] ${feedback.subject}`,
        htmlBody: adminHtml,
        eventType: 'ADMIN_ALERT_FEEDBACK'
      }).catch(err => console.error('[Notification] Error enqueuing feedback alert mail:', err));
    }
  }

  /**
   * 7. Khi có lỗi hệ thống 500 nghiêm trọng
   */
  static async onSystemCriticalError(error: {
    message: string;
    stack?: string;
    path: string;
    method: string;
    userEmail?: string;
  }) {
    const adminEmails = await this.getAdminEmails();

    for (const adminEmail of adminEmails) {
      const adminHtml = buildEmailHtml({
        headline: 'Cảnh Báo Lỗi Máy Chủ 500 Nghiêm Trọng',
        badgeText: 'LỖI HỆ THỐNG',
        badgeColor: '#ef4444',
        priority: 'CRITICAL',
        summary: `Hệ thống vừa bắt được một ngoại lệ 500 chưa được xử lý tại endpoint <code>${error.method} ${error.path}</code>.`,
        details: [
          { label: 'Endpoint', value: `${error.method} ${error.path}` },
          { label: 'Thông báo lỗi', value: error.message },
          { label: 'Người dùng gặp lỗi', value: error.userEmail || 'Khách vãng lai / Khách chưa đăng nhập' },
          { label: 'Thời gian', value: new Date().toLocaleString('vi-VN') }
        ],
        footerNote: 'Khuyến nghị: Đăng nhập SSH VPS hoặc kiểm tra nhật ký log PM2 để tiến hành khắc phục.'
      });

      await emailQueueService.enqueue({
        recipient: adminEmail,
        subject: `🚨 [CRITICAL ALERT] Lỗi 500 tại ${error.method} ${error.path}`,
        htmlBody: adminHtml,
        eventType: 'SYSTEM_ERROR_500',
        priority: 'CRITICAL'
      }).catch(err => console.error('[Notification] Error enqueuing 500 error alert mail:', err));
    }
  }

  /**
   * 8. Khi người dùng yêu cầu đặt lại mật khẩu qua Gmail
   */
  static async onPasswordResetRequested(data: {
    userId: string;
    userName: string;
    email: string;
    resetUrl: string;
    resetToken: string;
    expiresMinutes: number;
    ip?: string;
  }) {
    const userHtml = buildEmailHtml({
      headline: 'Yêu cầu Đặt lại Mật khẩu Tài khoản',
      recipientName: data.userName || 'Bạn',
      badgeText: 'BẢO MẬT TÀI KHOẢN',
      badgeColor: '#ef4444',
      summary: `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${data.email}</strong>. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới an toàn cho bạn.`,
      details: [
        { label: 'Tài khoản', value: data.email },
        { label: 'Thời hạn liên kết', value: `${data.expiresMinutes} phút` },
        { label: 'Mã xác thực thủ công', value: data.resetToken },
        { label: 'Địa chỉ IP yêu cầu', value: data.ip || 'Bảo mật ẩn danh' }
      ],
      actionLabel: 'Đặt Lại Mật Khẩu Ngay',
      actionUrl: data.resetUrl,
      footerNote: 'Nếu bạn KHÔNG yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này. Tài khoản của bạn vẫn hoàn toàn an toàn.'
    });

    await emailQueueService.enqueue({
      recipient: data.email,
      subject: '🔐 [LifeOS] Hướng dẫn Đặt lại Mật khẩu Tài khoản của bạn',
      htmlBody: userHtml,
      eventType: 'AUTH_PASSWORD_RESET',
      metadata: { userId: data.userId, expiresMinutes: data.expiresMinutes }
    }).catch(err => console.error('[Notification] Error enqueuing password reset mail:', err));
  }
}
