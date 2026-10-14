import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbService, getPrisma } from '../db.js';
import { requireAuth, AuthRequest, getJwtSecret } from '../auth.middleware.js';
import { referralService } from '../services/referral.service.js';
import { gmailService } from '../services/gmailNotification.service.js';
import { sendEmail } from '../mailer.js';
import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  validateBody
} from '../validation.js';
import { authRateLimiter, passwordResetRateLimiter } from '../security/rateLimiter.js';

export const authRouter = Router();

// Cookie configuration helper
function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie('token', {
    httpOnly: true,
    path: '/'
  });
}

// --------------------------------------------------------------------------
// 1. User Registration
// --------------------------------------------------------------------------
authRouter.post('/register', authRateLimiter, validateBody(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const isRegistrationAllowed = process.env.ALLOW_PUBLIC_REGISTRATION !== 'false';
    if (!isRegistrationAllowed) {
      res.status(403).json({
        success: false,
        error: {
          code: 'REGISTRATION_DISABLED',
          message: 'Chức năng tự đăng ký hiện đang đóng. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.'
        },
        message: 'Chức năng tự đăng ký hiện đang đóng. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.'
      });
      return;
    }

    const { name, email, password } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    // Do NOT trim password as per security requirements
    const rawPassword = String(password);

    // Check if user already exists
    const existing = await dbService.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.'
        },
        message: 'Email này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.'
      });
      return;
    }

    // Hash password with bcrypt salt 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Create user in PostgreSQL
    const newUser = await dbService.createUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: 'USER',
      plan: 'FREE',
      status: 'ACTIVE'
    });

    // Auto-create referral profile for new user
    await referralService.getOrCreateProfile(newUser.id).catch(e => console.warn('Referral profile init warning:', e));

    // Bind referral code if provided in query or body
    const referralCode = req.body.referralCode || req.query.ref;
    if (referralCode) {
      await referralService.bindReferral(newUser.id, String(referralCode)).catch(e => console.warn('Referral bind warning:', e));
    }

    // Issue JWT Token (14 days validity)
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, email: newUser.email },
      getJwtSecret(),
      { expiresIn: '14d' }
    );

    // Save session in Postgres
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await dbService.createSession(newUser.id, token, expiresAt);

    // Set HTTP-Only secure cookie
    setSessionCookie(req, res, token);

    // Record audit log
    await dbService.createAuditLog(
      newUser.id,
      'USER_SELF_REGISTER',
      'users',
      newUser.id,
      null,
      { email: newUser.email, name: newUser.name, ip: clientIp }
    );

    // Automation: Dispatch welcome and payment guidance notifications
    const prisma = getPrisma();
    await prisma.notification.createMany({
      data: [
        {
          userId: newUser.id,
          title: '🎉 Chào mừng bạn đến với LifeOS!',
          message: 'Tài khoản của bạn đã được khởi tạo thành công. Bạn đang ở chế độ xem thử (Preview) không gian làm việc.',
          type: 'info',
          read: false
        },
        {
          userId: newUser.id,
          title: '⚡ Hướng dẫn kích hoạt bản quyền LifeOS',
          message: 'Để mở khóa toàn bộ các phân hệ quản lý công việc, tài chính, thói quen và mục tiêu, vui lòng chọn gói dịch vụ tại mục "Gói cước & Đội ngũ" và quét mã VietQR để kích hoạt.',
          type: 'warning',
          read: false
        }
      ]
    }).catch(e => console.warn('Registration notifications creation warning:', e));

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      plan: newUser.plan,
      status: newUser.status,
      avatar: newUser.avatar,
      planExpiresAt: newUser.planExpiresAt,
      onboardingCompleted: newUser.onboardingCompleted
    };

    res.status(201).json({
      success: true,
      message: 'Khởi tạo tài khoản thành công',
      user: safeUser
      // NOTE: token is intentionally NOT returned in body — use httpOnly cookie only
    });
  } catch (error: any) {
    console.error('Register error:', error);
    let errMsg = error.message || '';
    if (errMsg.includes('localhost:5432') || errMsg.includes("Can't reach database server") || errMsg.includes('P1001')) {
      errMsg = 'Chưa kết nối được Cơ sở dữ liệu Cloud. Vui lòng kiểm tra biến môi trường DATABASE_URL trong mục Variables trên Railway.';
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Lỗi máy chủ khi khởi tạo tài khoản: ' + errMsg },
      message: 'Lỗi máy chủ khi khởi tạo tài khoản: ' + errMsg
    });
  }
});

// --------------------------------------------------------------------------
// 2. User & Admin Login with Rate Limiting and Audit
// --------------------------------------------------------------------------
authRouter.post('/login', authRateLimiter, validateBody(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { identifier, email, username, password } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    const rawInput = (identifier || email || username || '').toString();
    const cleanInput = rawInput.toLowerCase().trim();
    // Do NOT trim password as per security guidelines
    const rawPassword = String(password);

    // Rate limiting: check recent failed attempts for this identifier
    const failedAttempts = await dbService.getRecentFailedAttempts(cleanInput, 15);
    if (failedAttempts >= 5) {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.'
        },
        message: 'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.'
      });
      return;
    }

    let user = await dbService.findUserByEmailOrUsername(cleanInput);
    if (!user && (cleanInput === 'admin' || cleanInput === 'superadmin')) {
      const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@lifeos.com').toLowerCase().trim();
      user = await dbService.findUserByEmail(adminEmail);
    }

    if (!user) {
      await dbService.recordLoginAttempt(cleanInput, false, 'User not found', clientIp);
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác' },
        message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác'
      });
      return;
    }

    if (user.status === 'DISABLED') {
      await dbService.recordLoginAttempt(cleanInput, false, 'Account disabled', clientIp, user.id);
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.' },
        message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.'
      });
      return;
    }

    if (user.status === 'SUSPENDED') {
      await dbService.recordLoginAttempt(cleanInput, false, 'Account suspended', clientIp, user.id);
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Tài khoản của bạn đang bị tạm ngưng.' },
        message: 'Tài khoản của bạn đang bị tạm ngưng.'
      });
      return;
    }

    // Verify password strictly with bcrypt - NO fallback or default password bypass
    const isValidPassword = await bcrypt.compare(rawPassword, user.passwordHash);

    if (!isValidPassword) {
      await dbService.recordLoginAttempt(cleanInput, false, 'Invalid password', clientIp, user.id);
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác' },
        message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác'
      });
      return;
    }

    // Record successful login attempt
    await dbService.recordLoginAttempt(cleanInput, true, 'Success', clientIp, user.id);

    // Issue JWT Token (14 days validity)
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      getJwtSecret(),
      { expiresIn: '14d' }
    );

    // Save session in Postgres database
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await dbService.createSession(user.id, token, expiresAt);

    // Set HTTP-Only secure cookie
    setSessionCookie(req, res, token);

    // Audit log
    await dbService.createAuditLog(
      user.id,
      'USER_LOGIN',
      'users',
      user.id,
      null,
      { ip: clientIp, email: user.email }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      avatar: user.avatar,
      planExpiresAt: user.planExpiresAt,
      onboardingCompleted: user.onboardingCompleted
    };

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: safeUser
      // NOTE: token is intentionally NOT returned in body — use httpOnly cookie only
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Lỗi máy chủ khi đăng nhập: ' + error.message },
      message: 'Lỗi máy chủ khi đăng nhập: ' + error.message
    });
  }
});

// --------------------------------------------------------------------------
// 3. Logout endpoint (invalidates database session and clears cookie)
// --------------------------------------------------------------------------
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (token) {
    await dbService.deleteSession(token);
  }
  clearSessionCookie(res);
  res.json({ success: true, message: 'Đăng xuất thành công' });
});

// --------------------------------------------------------------------------
// 4. Logout all devices
// --------------------------------------------------------------------------
authRouter.post('/logout-all', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  await dbService.deleteAllUserSessions(userId);
  clearSessionCookie(res);

  await dbService.createAuditLog(
    userId,
    'USER_LOGOUT_ALL_DEVICES',
    'users',
    userId,
    null,
    { reason: 'User requested logout from all devices' }
  );

  res.json({ success: true, message: 'Đã đăng xuất khỏi tất cả các thiết bị' });
});

// --------------------------------------------------------------------------
// 5. Get current session user (/auth/me)
// --------------------------------------------------------------------------
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user || (await dbService.findUserById(req.userId!));
    if (!user) {
      clearSessionCookie(res);
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng' },
        message: 'Không tìm thấy người dùng'
      });
      return;
    }

    const { subscriptionService } = await import('../services/subscription.service.js');
    const subStatus = await subscriptionService.checkUserSubscription(user.id);

    // Ensure user.plan aligns with active subscription
    const verifiedPlan = user.role === 'ADMIN' || user.role === 'SUPERADMIN' 
      ? user.plan 
      : (subStatus.hasAccess ? (subStatus.planType === 'TEAM' ? 'TEAM' : 'PRO') : 'FREE');

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: verifiedPlan,
        status: user.status,
        avatar: user.avatar,
        planExpiresAt: subStatus.endDate || user.planExpiresAt || null,
        onboardingCompleted: user.onboardingCompleted
      },
      subscriptionStatus: subStatus,
      token: req.headers.authorization?.split(' ')[1] || req.cookies?.token
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
      message: error.message
    });
  }
});

// --------------------------------------------------------------------------
// 6. Update Profile
// --------------------------------------------------------------------------
authRouter.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, avatar, onboardingCompleted } = req.body;
    const updates: any = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof avatar === 'string') updates.avatar = avatar.trim();
    if (typeof onboardingCompleted === 'boolean') updates.onboardingCompleted = onboardingCompleted;

    const updated = await dbService.updateUser(userId, updates);
    res.json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        plan: updated.plan,
        status: updated.status,
        avatar: updated.avatar,
        planExpiresAt: updated.planExpiresAt,
        onboardingCompleted: updated.onboardingCompleted
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// 7. Change Password
// --------------------------------------------------------------------------
authRouter.post('/change-password', requireAuth, passwordResetRateLimiter, validateBody(ChangePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { oldPassword, newPassword } = req.body;
    const user = await dbService.findUserById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      return;
    }

    const isValid = await bcrypt.compare(String(oldPassword), user.passwordHash);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Mật khẩu hiện tại không chính xác' },
        message: 'Mật khẩu hiện tại không chính xác'
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);

    await dbService.updateUser(userId, { passwordHash });

    await dbService.createAuditLog(
      userId,
      'USER_CHANGE_PASSWORD',
      'users',
      userId,
      null,
      { reason: 'User updated password' }
    );

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// 8. Forgot Password (generates one-time token, 1 hour validity)
// --------------------------------------------------------------------------
authRouter.post('/forgot-password', passwordResetRateLimiter, validateBody(ForgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const user = await dbService.findUserByEmail(cleanEmail);

    if (user && user.status === 'ACTIVE') {
      const prisma = getPrisma();
      // Generate secure one-time token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
          used: false
        }
      });

      await dbService.createAuditLog(
        user.id,
        'PASSWORD_RESET_REQUESTED',
        'users',
        user.id,
        null,
        { email: cleanEmail }
      );

      // Deliver reset link by email ONLY. Token must never be returned over HTTP in non-test envs.
      if (process.env.NODE_ENV === 'test') {
        res.json({
          success: true,
          message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
          resetToken
        });
        return;
      }

      const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const resetUrl = `${appUrl}/?resetToken=${resetToken}`;
      const mailResult = await gmailService.sendNotification({
        to: user.email,
        recipientName: user.name || 'Quý khách',
        subject: '[Life OS] Yêu cầu đặt lại mật khẩu',
        category: 'SECURITY',
        headline: 'Đặt lại mật khẩu tài khoản của bạn',
        content: `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${user.email}</strong>.<br/><br/>Liên kết có hiệu lực trong <strong>60 phút</strong> và chỉ dùng được một lần.<br/><br/>Mã đặt lại (nếu cần nhập thủ công):<br/><code style="word-break:break-all">${resetToken}</code><br/><br/>Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
        actionLabel: 'Đặt lại mật khẩu',
        actionUrl: resetUrl,
        badgeText: 'Bảo mật',
        badgeColor: '#ef4444'
      }).catch((e: any) => ({ sent: false, message: e?.message || 'send failed' }));

      if (!mailResult?.sent) {
        // Fallback to direct SMTP transport
        const fallback = await sendEmail(
          user.email,
          '[Life OS] Yêu cầu đặt lại mật khẩu',
          `<p>Liên kết đặt lại mật khẩu (hiệu lực 60 phút): <a href="${resetUrl}">${resetUrl}</a></p><p>Mã: <code>${resetToken}</code></p>`
        );
        if (!fallback.sent) {
          console.error(`[ForgotPassword] Could not deliver reset email to user ${user.id}: ${mailResult?.message} / ${fallback.message}`);
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV ONLY] Password reset token for ${cleanEmail}: ${resetToken}`);
      }
    }

    // Always respond with identical message to prevent user enumeration
    res.json({
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.'
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Lỗi xử lý yêu cầu đặt lại mật khẩu' },
      message: 'Lỗi xử lý yêu cầu đặt lại mật khẩu'
    });
  }
});

// --------------------------------------------------------------------------
// 9. Reset Password using one-time token
// --------------------------------------------------------------------------
authRouter.post('/reset-password', passwordResetRateLimiter, validateBody(ResetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const prisma = getPrisma();

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
        },
        message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
      });
      return;
    }

    // Hash new password without trimming
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);

    // Update user password and mark token as used atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true }
      }),
      // Invalidate all existing sessions so old logins cannot access account
      prisma.session.deleteMany({
        where: { userId: record.userId }
      })
    ]);

    await dbService.createAuditLog(
      record.userId,
      'PASSWORD_RESET_COMPLETED',
      'users',
      record.userId,
      null,
      { tokenUsed: record.id }
    );

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
      message: err.message
    });
  }
});

// --------------------------------------------------------------------------
// 10. Personalized Workspace Setup from Onboarding Selections
// --------------------------------------------------------------------------
authRouter.post('/onboarding-setup', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const selections = req.body.selections || req.body || {};

    const summary = await dbService.setupUserPersonalizedWorkspace(userId, selections);
    const updatedUser = await dbService.findUserById(userId);

    await dbService.createAuditLog(
      userId,
      'USER_COMPLETE_ONBOARDING',
      'users',
      userId,
      null,
      { selections, summary }
    );

    res.json({
      success: true,
      message: 'Thiết lập không gian làm việc cá nhân hóa thành công',
      summary,
      user: updatedUser ? {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        plan: updatedUser.plan,
        status: updatedUser.status,
        avatar: updatedUser.avatar,
        planExpiresAt: updatedUser.planExpiresAt,
        onboardingCompleted: updatedUser.onboardingCompleted
      } : null
    });
  } catch (err: any) {
    console.error('Onboarding setup error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Lỗi khi cấu hình dữ liệu khảo sát: ' + err.message },
      message: 'Lỗi khi cấu hình dữ liệu khảo sát: ' + err.message
    });
  }
});

// --------------------------------------------------------------------------
// 11. Active Sessions Management
// --------------------------------------------------------------------------
authRouter.get('/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();
    const currentToken = req.cookies?.token;

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedSessions = sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === currentToken
    }));

    res.json({
      success: true,
      sessions: formattedSessions,
      totalActive: formattedSessions.length
    });
  } catch (err: any) {
    console.error('GET /api/auth/sessions error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

authRouter.post('/sessions/revoke-others', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();
    const currentToken = req.cookies?.token;

    const deleteResult = await prisma.session.deleteMany({
      where: {
        userId,
        token: { not: currentToken || '' }
      }
    });

    await dbService.createAuditLog(
      userId,
      'USER_REVOKE_OTHER_SESSIONS',
      'sessions',
      userId,
      null,
      { revokedCount: deleteResult.count }
    );

    res.json({
      success: true,
      message: `Đã đăng xuất khỏi ${deleteResult.count} thiết bị/phiên làm việc khác thành công.`,
      revokedCount: deleteResult.count
    });
  } catch (err: any) {
    console.error('POST /api/auth/sessions/revoke-others error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

