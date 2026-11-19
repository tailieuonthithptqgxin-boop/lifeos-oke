import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbService, getPrisma } from '../db.js';
import { requireAuth, AuthRequest, getJwtSecret } from '../auth.middleware.js';
import { referralService } from '../services/referral.service.js';
import { gmailService } from '../services/gmailNotification.service.js';
import { sendEmail } from '../mailer.js';
import { classroomService } from '../services/classroom.service.js';
import { SystemNotificationHelper } from '../services/systemNotification.helper.js';
import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  ChangePasswordSchema,
  validateBody
} from '../validation.js';
import { authRateLimiter, passwordResetRateLimiter } from '../security/rateLimiter.js';

export const authRouter = Router();

// Resilient origin & HTTPS detector behind reverse proxies (Cloudflare / Nginx / Vite)
function getRequestOriginInfo(req: Request): { host: string; proto: 'http' | 'https'; origin: string; isHttps: boolean } {
  const rawHost = String(req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').split(',')[0].trim();
  const rawProto = String(req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).split(',')[0].trim().toLowerCase();
  const proto: 'http' | 'https' = rawProto === 'https' ? 'https' : 'http';
  const origin = `${proto}://${rawHost}`.replace(/\/$/, '');
  return { host: rawHost, proto, origin, isHttps: proto === 'https' };
}

// Cookie configuration helper
// Use SameSite=Lax (same-origin app + OAuth top-level redirects) so modern Chrome/Safari never drop the session cookie
function setSessionCookie(req: Request, res: Response, token: string) {
  const { isHttps } = getRequestOriginInfo(req);
  res.cookie('token', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
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

    // Calculate exact 7-Day Free Trial (7 * 24 hours from creation)
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@lifeos.com').toLowerCase().trim();
    const isInitialAdmin = cleanEmail === initialAdminEmail;

    // Create user in PostgreSQL with 100% Free Full Access entitlement
    const newUser = await dbService.createUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: isInitialAdmin ? 'SUPERADMIN' : 'USER',
      plan: isInitialAdmin ? 'TEAM' : 'PRO',
      status: 'ACTIVE',
      trialStartedAt: now,
      trialEndsAt: null,
      trialUsed: true
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
      { userId: newUser.id, role: newUser.role, email: newUser.email, jti: crypto.randomUUID() },
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
          title: '🎉 Kích hoạt 7 ngày dùng thử miễn phí LifeOS!',
          message: `Chào mừng bạn! Tài khoản của bạn đã được kích hoạt 7 ngày dùng thử miễn phí toàn bộ tính năng cao cấp (hết hạn vào ${trialEndsAt.toLocaleString('vi-VN')}).`,
          type: 'info',
          read: false
        },
        {
          userId: newUser.id,
          title: '⚡ Trải nghiệm không giới hạn',
          message: 'Bạn có thể tự do trải nghiệm Quản lý Công việc, Tài chính, Thói quen, Mục tiêu và Không gian Học tập. Sau 7 ngày, hãy nâng cấp gói để tiếp tục đồng bộ.',
          type: 'success',
          read: false
        }
      ]
    }).catch(e => console.warn('Registration notifications creation warning:', e));

    // Guaranteed Outbox Email Delivery: Welcome email to User + New User Alert to Admin
    SystemNotificationHelper.onUserRegistered(
      { id: newUser.id, name: newUser.name, email: newUser.email },
      clientIp
    ).catch(e => console.warn('[EmailQueue] Error enqueuing registration notification:', e));

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      plan: newUser.plan,
      status: newUser.status,
      avatar: newUser.avatar,
      planExpiresAt: newUser.planExpiresAt,
      onboardingCompleted: newUser.onboardingCompleted,
      trialStartedAt: newUser.trialStartedAt,
      trialEndsAt: newUser.trialEndsAt
    };

    res.status(201).json({
      success: true,
      message: 'Khởi tạo tài khoản thành công',
      user: safeUser,
      token
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
// Helper: Get Unified User Stats (Single Source of Truth)
// --------------------------------------------------------------------------
export async function getUnifiedUserStats(userId: string) {
  const prisma = getPrisma();
  const [progression, refProfile, userRecord] = await Promise.all([
    prisma.userProgression.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true, lastActiveDate: true, level: true, totalXp: true }
    }).catch(() => null),
    prisma.referralProfile.findUnique({
      where: { userId },
      select: { approvedReward: true, totalReferred: true, totalCommission: true }
    }).catch(() => null),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, totalStudyMinutes: true, weeklyStudyMinutes: true, lastStudyDate: true }
    }).catch((err) => {
      console.warn('[getUnifiedUserStats] user query warning:', err?.message || err);
      return null;
    })
  ]);

  const streakDays = progression?.currentStreak ?? 0;
  const lastActiveDate = progression?.lastActiveDate ?? null;
  const totalStudyMinutes = userRecord?.totalStudyMinutes ?? 0;
  const commissionBalance = refProfile?.approvedReward ?? 0;
  const referredCount = refProfile?.totalReferred ?? 0;

  let badgeLevel: 'Tân Binh' | 'Chiến Binh' | 'Ngôi Sao' = 'Tân Binh';
  if (streakDays >= 30 || totalStudyMinutes >= 1800) badgeLevel = 'Ngôi Sao';
  else if (streakDays >= 7 || totalStudyMinutes >= 300) badgeLevel = 'Chiến Binh';

  return {
    streakDays,
    lastActiveDate,
    totalStudyMinutes,
    todayStudyMinutes: 0,
    badgeLevel,
    commissionBalance,
    referredCount,
    displayName: userRecord?.name || 'Bạn',
    level: progression?.level ?? 1,
    xp: progression?.totalXp ?? 0
  };
}

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
    try {
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
    } catch (e: any) {
      console.warn('Could not query recent failed attempts (DB issue):', e.message);
    }

    let user;
    try {
      user = await dbService.findUserByEmailOrUsername(cleanInput);
      if (!user && (cleanInput === 'admin' || cleanInput === 'superadmin')) {
        const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@lifeos.com').toLowerCase().trim();
        user = await dbService.findUserByEmail(adminEmail);
      }
    } catch (dbErr: any) {
      console.error('❌ Database error during login query:', dbErr.message || dbErr);
      const isQuota = String(dbErr.message || '').includes('quota') || String(dbErr.code || '') === '53000';
      res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: isQuota
            ? 'Cơ sở dữ liệu đám mây (Neon) đã hết hạn mức dung lượng/quota miễn phí. Vui lòng chuyển sang PostgreSQL nội bộ VPS để chạy ổn định lâu dài.'
            : 'Máy chủ không thể kết nối tới Cơ sở dữ liệu (PostgreSQL). Vui lòng kiểm tra lại dịch vụ CSDL.'
        },
        message: isQuota
          ? 'Cơ sở dữ liệu đám mây (Neon) đã hết hạn mức dung lượng/quota miễn phí. Vui lòng chuyển sang PostgreSQL nội bộ VPS để chạy ổn định lâu dài.'
          : 'Máy chủ không thể kết nối tới Cơ sở dữ liệu (PostgreSQL). Vui lòng kiểm tra lại dịch vụ CSDL.'
      });
      return;
    }

    if (!user) {
      console.warn(`[AuthAudit][user_not_found] Đăng nhập thất bại: Tài khoản không tồn tại ("${cleanInput}") từ IP: ${clientIp}`);
      await dbService.recordLoginAttempt(cleanInput, false, 'user_not_found', clientIp).catch(() => {});
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác' },
        message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác'
      });
      return;
    }

    if (user.status === 'DISABLED') {
      console.warn(`[AuthAudit][disabled_account] Tài khoản bị vô hiệu hóa: ${user.email} (ID: ${user.id})`);
      await dbService.recordLoginAttempt(cleanInput, false, 'disabled_account', clientIp, user.id);
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.' },
        message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.'
      });
      return;
    }

    if (user.status === 'SUSPENDED') {
      console.warn(`[AuthAudit][suspended_account] Tài khoản đang bị tạm ngưng: ${user.email} (ID: ${user.id})`);
      await dbService.recordLoginAttempt(cleanInput, false, 'suspended_account', clientIp, user.id);
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Tài khoản của bạn đang bị tạm ngưng.' },
        message: 'Tài khoản của bạn đang bị tạm ngưng.'
      });
      return;
    }

    // Verify password strictly with bcrypt
    const isValidPassword = await bcrypt.compare(rawPassword, user.passwordHash);

    if (!isValidPassword) {
      // Check if this account was created via Google OAuth and has not set an email password
      const isGoogleOnly = Boolean(user.googleId) && Boolean(user.passwordHash);
      if (isGoogleOnly) {
        console.warn(`[AuthAudit][oauth_account] Người dùng ${user.email} được tạo bằng Google OAuth; nhập mật khẩu trực tiếp không khớp.`);
        await dbService.recordLoginAttempt(cleanInput, false, 'oauth_account', clientIp, user.id);
        res.status(401).json({
          success: false,
          error: {
            code: 'OAUTH_ACCOUNT',
            message: 'Tài khoản này được đăng ký thông qua Google. Vui lòng bấm "Đăng nhập bằng Google", hoặc sử dụng chức năng "Quên mật khẩu" để thiết lập mật khẩu trực tiếp.'
          },
          message: 'Tài khoản này được đăng ký thông qua Google. Vui lòng bấm "Đăng nhập bằng Google", hoặc sử dụng chức năng "Quên mật khẩu" để thiết lập mật khẩu trực tiếp.'
        });
        return;
      }

      console.warn(`[AuthAudit][invalid_password] Mật khẩu không chính xác cho tài khoản: ${user.email}`);
      await dbService.recordLoginAttempt(cleanInput, false, 'invalid_password', clientIp, user.id);
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác' },
        message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác'
      });
      return;
    }

    // Record successful login attempt
    console.info(`[AuthAudit][login_success] Đăng nhập thành công: ${user.email} (Role: ${user.role})`);
    await dbService.recordLoginAttempt(cleanInput, true, 'login_success', clientIp, user.id);

    // Issue JWT Token (14 days validity)
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, jti: crypto.randomUUID() },
      getJwtSecret(),
      { expiresIn: '14d' }
    );

    // Save session in Postgres database
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await dbService.createSession(user.id, token, expiresAt);

    // Set HTTP-Only secure cookie
    setSessionCookie(req, res, token);

    // Auto-create referral profile for user and bind referrer if applicable
    await referralService.getOrCreateProfile(user.id).catch(e => console.warn('Referral profile init warning:', e));
    const loginRefCode = req.body.referralCode || req.query.ref;
    if (loginRefCode) {
      await referralService.bindReferral(user.id, String(loginRefCode)).catch(e => console.warn('Referral bind on login warning:', e));
    }

    // Audit log
    await dbService.createAuditLog(
      user.id,
      'USER_LOGIN',
      'users',
      user.id,
      null,
      { ip: clientIp, email: user.email }
    );

    // If user is Admin or SuperAdmin, ensure their plan is not FREE
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      if (user.plan === 'FREE') {
        const prisma = getPrisma();
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'TEAM' }
        });
        user.plan = 'TEAM';
      }
    }

    const unifiedStats = await getUnifiedUserStats(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      displayName: user.name || 'Bạn',
      email: user.email,
      role: user.role,
      plan: (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? (user.plan && user.plan !== 'FREE' ? user.plan : 'TEAM') : user.plan,
      status: user.status,
      avatar: user.avatar,
      isAffiliate: Boolean((user as any).isAffiliate || (user as any).is_affiliate),
      planExpiresAt: user.planExpiresAt,
      onboardingCompleted: user.onboardingCompleted,
      streakDays: unifiedStats.streakDays,
      lastActiveDate: unifiedStats.lastActiveDate,
      totalStudyMinutes: unifiedStats.totalStudyMinutes,
      todayStudyMinutes: unifiedStats.todayStudyMinutes,
      badgeLevel: unifiedStats.badgeLevel,
      commissionBalance: unifiedStats.commissionBalance,
      referredCount: unifiedStats.referredCount,
      level: unifiedStats.level,
      xp: unifiedStats.xp
    };

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: safeUser,
      token
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
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    if (isAdmin && user.plan === 'FREE') {
      const prisma = getPrisma();
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'TEAM' }
      }).catch(err => console.warn('Failed to auto-heal admin plan:', err));
      user.plan = 'TEAM';
    }

    const verifiedPlan = isAdmin 
      ? (user.plan && user.plan !== 'FREE' ? user.plan : 'TEAM') 
      : (subStatus.hasAccess ? (subStatus.planType === 'TEAM' ? 'TEAM' : 'PRO') : 'FREE');

    const unifiedStats = await getUnifiedUserStats(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        displayName: user.name || 'Bạn',
        email: user.email,
        role: user.role,
        plan: verifiedPlan,
        status: user.status,
        avatar: user.avatar,
        isAffiliate: Boolean((user as any).isAffiliate || (user as any).is_affiliate),
        planExpiresAt: subStatus.endDate || user.planExpiresAt || null,
        onboardingCompleted: user.onboardingCompleted,
        trialStartedAt: (user as any).trialStartedAt || null,
        trialEndsAt: (user as any).trialEndsAt || null,
        isTrial: Boolean(subStatus.isTrial),
        streakDays: unifiedStats.streakDays,
        lastActiveDate: unifiedStats.lastActiveDate,
        totalStudyMinutes: unifiedStats.totalStudyMinutes,
        todayStudyMinutes: unifiedStats.todayStudyMinutes,
        badgeLevel: unifiedStats.badgeLevel,
        commissionBalance: unifiedStats.commissionBalance,
        referredCount: unifiedStats.referredCount,
        level: unifiedStats.level,
        xp: unifiedStats.xp
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
// 5b. Unified Stats Sync (Single Source of Truth)
// --------------------------------------------------------------------------
authRouter.post(['/unified-stats', '/sync-stats'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { streakDays, lastActiveDate, totalStudyMinutes } = req.body;
    const prisma = getPrisma();

    // 1. Update userProgression
    if (typeof streakDays === 'number' || typeof lastActiveDate === 'string') {
      await prisma.userProgression.upsert({
        where: { userId },
        update: {
          ...(typeof streakDays === 'number' ? { currentStreak: streakDays } : {}),
          ...(typeof lastActiveDate === 'string' ? { lastActiveDate } : {})
        },
        create: {
          userId,
          currentStreak: typeof streakDays === 'number' ? streakDays : 0,
          longestStreak: typeof streakDays === 'number' ? streakDays : 0,
          lastActiveDate: typeof lastActiveDate === 'string' ? lastActiveDate : null
        }
      }).catch(() => {});
    }

    // 2. Update user table study minutes (CamelCase Prisma client field names)
    if (typeof totalStudyMinutes === 'number') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalStudyMinutes: totalStudyMinutes,
          lastStudyDate: new Date()
        }
      }).catch((err) => {
        console.warn('[unified-stats] failed to update user study minutes:', err?.message || err);
      });
    }

    const currentStats = await getUnifiedUserStats(userId);
    res.json({
      success: true,
      stats: currentStats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

authRouter.get('/unified-stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getUnifiedUserStats(req.userId!);
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
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

    SystemNotificationHelper.onPasswordChanged(
      { id: user.id, name: user.name, email: user.email },
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
      req.headers['user-agent']
    ).catch(() => {});

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
// 7.1. DELETE ACCOUNT & FULL DATA ERASURE (Nghị định 13/2023/NĐ-CP Điều 9 & GDPR)
// --------------------------------------------------------------------------
authRouter.delete('/account', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { confirmation, password } = req.body || {};
    const prisma = getPrisma();

    const user = await dbService.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    }

    // Security Verification: Exact confirmation phrase or correct password
    const isPhraseValid = confirmation === 'XÓA VĨNH VIỄN' || confirmation === 'DELETE_PERMANENTLY';
    if (!isPhraseValid) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập cụm từ "XÓA VĨNH VIỄN" hoặc nhập mật khẩu để xác nhận hủy tài khoản.'
        });
      }
      const isPasswordMatch = await bcrypt.compare(String(password), user.passwordHash);
      if (!isPasswordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu xác nhận không chính xác.'
        });
      }
    }

    // Full cascading deletion transaction in Prisma
    await prisma.$transaction(async (tx: any) => {
      // 1. Delete authentication & sessions
      await tx.session.deleteMany({ where: { userId } }).catch(() => {});
      await tx.passwordResetToken.deleteMany({ where: { userId } }).catch(() => {});
      await tx.passwordResetRequest.deleteMany({ where: { userId } }).catch(() => {});
      await tx.loginAttempt.deleteMany({ where: { userId } }).catch(() => {});
      await tx.securityEvent.deleteMany({ where: { userId } }).catch(() => {});

      // 2. Delete tasks, notes, habits, goals, projects
      await tx.task.deleteMany({ where: { userId } }).catch(() => {});
      await tx.projectMember.deleteMany({ where: { userId } }).catch(() => {});
      await tx.project.deleteMany({ where: { userId } }).catch(() => {});
      await tx.goal.deleteMany({ where: { userId } }).catch(() => {});
      await tx.habit.deleteMany({ where: { userId } }).catch(() => {});
      await tx.note.deleteMany({ where: { userId } }).catch(() => {});
      await tx.noteTag.deleteMany({ where: { userId } }).catch(() => {});

      // 3. Delete calendar, schedule, focus
      await tx.calendarEvent.deleteMany({ where: { userId } }).catch(() => {});
      await tx.scheduleBlock.deleteMany({ where: { userId } }).catch(() => {});
      await tx.reminder.deleteMany({ where: { userId } }).catch(() => {});
      await tx.focusSession.deleteMany({ where: { userId } }).catch(() => {});
      await tx.focusGoal.deleteMany({ where: { userId } }).catch(() => {});

      // 4. Delete finances
      await tx.transaction.deleteMany({ where: { userId } }).catch(() => {});
      await tx.budget.deleteMany({ where: { userId } }).catch(() => {});
      await tx.savingGoal.deleteMany({ where: { userId } }).catch(() => {});
      await tx.debt.deleteMany({ where: { userId } }).catch(() => {});
      await tx.recurringTransaction.deleteMany({ where: { userId } }).catch(() => {});
      await tx.financeAccount.deleteMany({ where: { userId } }).catch(() => {});

      // 5. Delete study & vocab
      await tx.studyAssignment.deleteMany({ where: { userId } }).catch(() => {});
      await tx.studyExam.deleteMany({ where: { userId } }).catch(() => {});
      await tx.studySession.deleteMany({ where: { userId } }).catch(() => {});
      await tx.subject.deleteMany({ where: { userId } }).catch(() => {});
      await tx.vocabWordProgress.deleteMany({ where: { userId } }).catch(() => {});

      // 6. Delete decisions, automations, notifications
      await tx.decision.deleteMany({ where: { userId } }).catch(() => {});
      await tx.automationExecution.deleteMany({ where: { userId } }).catch(() => {});
      await tx.automationRule.deleteMany({ where: { userId } }).catch(() => {});
      await tx.notificationDelivery.deleteMany({ where: { userId } }).catch(() => {});
      await tx.notification.deleteMany({ where: { userId } }).catch(() => {});
      await tx.userNotificationPreference.deleteMany({ where: { userId } }).catch(() => {});
      await tx.userNotificationRule.deleteMany({ where: { userId } }).catch(() => {});
      await tx.userEmailIntegration.deleteMany({ where: { userId } }).catch(() => {});

      // 7. Delete orders, cart, subscriptions, referrals
      await tx.cartItem.deleteMany({ where: { userId } }).catch(() => {});
      await tx.order.deleteMany({ where: { userId } }).catch(() => {});
      await tx.payment.deleteMany({ where: { userId } }).catch(() => {});
      await tx.subscription.deleteMany({ where: { userId } }).catch(() => {});
      await tx.customModuleRecord.deleteMany({ where: { userId } }).catch(() => {});
      await tx.feedback.deleteMany({ where: { userId } }).catch(() => {});
      await tx.templateUsage.deleteMany({ where: { userId } }).catch(() => {});

      // 8. Delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    clearSessionCookie(res);

    res.json({
      success: true,
      message: 'Toàn bộ dữ liệu cá nhân và tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống theo Nghị định 13/2023/NĐ-CP.'
    });
  } catch (err: any) {
    console.error('DELETE /api/auth/account error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa tài khoản: ' + err.message });
  }
});

// --------------------------------------------------------------------------
// 7.2. EXPORT PERSONAL DATA (GDPR / CCPA / Nghị định 13 Data Portability)
// --------------------------------------------------------------------------
authRouter.get('/export-data', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();

    const user = await dbService.findUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    }

    const [tasks, notes, habits, goals, transactions, budgets, vocabProgress] = await Promise.all([
      prisma.task.findMany({ where: { userId } }).catch(() => []),
      prisma.note.findMany({ where: { userId } }).catch(() => []),
      prisma.habit.findMany({ where: { userId } }).catch(() => []),
      prisma.goal.findMany({ where: { userId } }).catch(() => []),
      prisma.transaction.findMany({ where: { userId } }).catch(() => []),
      prisma.budget.findMany({ where: { userId } }).catch(() => []),
      prisma.vocabWordProgress.findMany({ where: { userId } }).catch(() => [])
    ]);

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const exportBundle = {
      exportMetadata: {
        appName: 'LifeOS (quanlicanhan.online)',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        complianceStandards: ['Nghị định 13/2023/NĐ-CP Điều 9', 'GDPR Article 20 Data Portability', 'CCPA'],
        subjectEmail: user.email
      },
      profile: sanitizedUser,
      tasks,
      notes,
      habits,
      goals,
      financialRecords: {
        transactions,
        budgets
      },
      studyProgress: {
        vocabProgress
      }
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `lifeos_data_export_${userId.slice(0, 8)}_${dateStr}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportBundle);
  } catch (err: any) {
    console.error('GET /api/auth/export-data error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi xuất dữ liệu: ' + err.message });
  }
});

// --------------------------------------------------------------------------
// 8. Verify Password Reset Token (Pre-flight check for UI state)
// --------------------------------------------------------------------------
authRouter.get('/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      res.status(400).json({ valid: false, reason: 'TOKEN_REQUIRED', message: 'Mã token không được để trống.' });
      return;
    }

    const prisma = getPrisma();
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, name: true, status: true }
        }
      }
    });

    if (!record) {
      res.json({ valid: false, reason: 'NOT_FOUND', message: 'Liên kết đặt lại mật khẩu không tồn tại hoặc đã bị xóa.' });
      return;
    }

    if (record.used) {
      res.json({ valid: false, reason: 'USED', message: 'Liên kết đặt lại mật khẩu này đã được sử dụng trước đó.' });
      return;
    }

    const isExpired = new Date(record.expiresAt).getTime() < Date.now();
    if (isExpired) {
      res.json({ valid: false, reason: 'EXPIRED', message: 'Liên kết đặt lại mật khẩu đã hết hạn (tối đa 30 phút). Vui lòng yêu cầu lại.' });
      return;
    }

    // Obfuscate email for UI preview: e.g. j***@gmail.com
    const rawEmail = record.user?.email || '';
    const [namePart, domainPart] = rawEmail.split('@');
    const maskedEmail = namePart.length > 2
      ? `${namePart[0]}***${namePart.slice(-1)}@${domainPart || ''}`
      : `${namePart[0] || '*'}***@${domainPart || ''}`;

    res.json({
      valid: true,
      emailMasked: maskedEmail,
      expiresAt: record.expiresAt
    });
  } catch (err: any) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ valid: false, reason: 'SERVER_ERROR', message: 'Lỗi kiểm tra tính hợp lệ của token.' });
  }
});

// --------------------------------------------------------------------------
// 9. Forgot Password (Guaranteed Outbox Email Delivery via Gmail Queue)
// --------------------------------------------------------------------------
authRouter.post('/forgot-password', passwordResetRateLimiter, validateBody(ForgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const cleanEmail = email.toLowerCase().trim();
    const user = await dbService.findUserByEmail(cleanEmail);

    if (user && user.status === 'ACTIVE') {
      const prisma = getPrisma();
      
      // Invalidate any older unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true }
      }).catch(e => console.warn('Old tokens cleanup warning:', e));

      // Generate cryptographically secure one-time token (32 bytes = 64 hex chars)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresMinutes = 30; // 30 minutes window as per security spec
      const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

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
        { email: cleanEmail, ip: clientIp }
      );

      // Determine public domain for reset URL
      const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const resetUrl = `${appUrl}/?resetToken=${resetToken}`;

      // Enqueue to guaranteed email queue (Worker automatically delivers via Gmail with auto-retry)
      await SystemNotificationHelper.onPasswordResetRequested({
        userId: user.id,
        userName: user.name,
        email: user.email,
        resetUrl,
        resetToken,
        expiresMinutes,
        ip: clientIp
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUTH-DEV] Password reset link for ${cleanEmail}: ${resetUrl}`);
      }
    }

    // Always respond with identical message to prevent account enumeration
    res.json({
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư Gmail của bạn. Vui lòng kiểm tra hộp thư đến (Inbox) hoặc thư mục Spam.'
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
// 10. Reset Password using one-time token
// --------------------------------------------------------------------------
authRouter.post('/reset-password', passwordResetRateLimiter, validateBody(ResetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const prisma = getPrisma();

    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Mã xác nhận đặt lại mật khẩu không hợp lệ.' },
        message: 'Mã xác nhận đặt lại mật khẩu không hợp lệ.'
      });
      return;
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: cleanToken },
      include: { user: true }
    });

    if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại liên kết mới.'
        },
        message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại liên kết mới.'
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
      // Revoke all existing sessions across devices for security
      prisma.session.deleteMany({
        where: { userId: record.userId }
      })
    ]);

    // Clear session cookie if active
    clearSessionCookie(res);

    await dbService.createAuditLog(
      record.userId,
      'PASSWORD_RESET_COMPLETED',
      'users',
      record.userId,
      null,
      { tokenUsed: record.id, ip: clientIp }
    );

    if (record.user) {
      SystemNotificationHelper.onPasswordChanged(
        { id: record.user.id, name: record.user.name, email: record.user.email },
        clientIp,
        req.headers['user-agent']
      ).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Mọi phiên đăng nhập cũ đã được đăng xuất an toàn. Vui lòng đăng nhập với mật khẩu mới.'
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
// 11. Google OAuth 2.0 / OpenID Connect Endpoints
// --------------------------------------------------------------------------

function resolveGoogleRedirectUri(req: Request): { host: string; origin: string; isHttps: boolean; redirectUri: string } {
  const { host, origin: dynamicOrigin, isHttps } = getRequestOriginInfo(req);
  const configuredCallback = (process.env.GOOGLE_CALLBACK_URL || '').trim();
  let redirectUri = `${dynamicOrigin}/api/auth/google/callback`;
  if (configuredCallback) {
    if (configuredCallback.startsWith('/')) {
      redirectUri = `${dynamicOrigin}${configuredCallback}`;
    } else {
      const isRequestLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const isCallbackLocal = configuredCallback.includes('localhost') || configuredCallback.includes('127.0.0.1');
      if (isRequestLocal || !isCallbackLocal) {
        // Avoid localhost vs 127.0.0.1 mismatch when testing locally
        if (isRequestLocal && isCallbackLocal) {
          redirectUri = `${dynamicOrigin}/api/auth/google/callback`;
        } else {
          redirectUri = configuredCallback;
        }
      }
    }
  }
  return { host, origin: dynamicOrigin, isHttps, redirectUri };
}

function redirectOAuthError(res: Response, code: string, reason?: string) {
  const qs = new URLSearchParams({ login: code });
  if (reason) qs.set('reason', reason.slice(0, 300));
  res.redirect(`/?${qs.toString()}`);
}

// 11A. Check if Google OAuth is configured
authRouter.get('/google/config', (req: Request, res: Response) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const { origin, redirectUri } = resolveGoogleRedirectUri(req);
  res.json({
    enabled: Boolean(clientId && clientId.length > 5 && clientSecret && clientSecret.length > 5),
    hasClientId: Boolean(clientId && clientId.length > 5),
    hasClientSecret: Boolean(clientSecret && clientSecret.length > 5),
    clientId: clientId || null,
    origin,
    redirectUri,
    mode: 'express-backend'
  });
});

// Cryptographic state helpers for resilient OAuth flow
function createSignedOAuthState(req: Request, redirectUri: string): string {
  const { origin } = getRequestOriginInfo(req);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ nonce, origin, redirectUri, ts: Date.now() });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifySignedOAuthState(rawState: string, storedCookieState?: string): { valid: boolean; origin?: string; redirectUri?: string } {
  if (!rawState || typeof rawState !== 'string') return { valid: false };

  // 1. Check matching cookie if present
  if (storedCookieState && rawState === storedCookieState) {
    try {
      const [b64] = rawState.split('.');
      if (b64) {
        const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
        return { valid: true, origin: payload.origin, redirectUri: payload.redirectUri };
      }
    } catch {}
    return { valid: true };
  }

  // 2. Cryptographic signature check (resilient against cross-domain redirect cookie blocking)
  try {
    const [b64, sig] = rawState.split('.');
    if (!b64 || !sig) return { valid: false };
    const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(b64).digest('base64url');
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { valid: false };
    }
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    // Valid for 15 minutes
    if (Date.now() - payload.ts > 15 * 60 * 1000) {
      return { valid: false };
    }
    return { valid: true, origin: payload.origin, redirectUri: payload.redirectUri };
  } catch (err) {
    return { valid: false };
  }
}

// 11B. Initiate Google OAuth Flow (Redirects to Google Sign-In)
authRouter.get('/google', (req: Request, res: Response) => {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
      const missing = [!clientId ? 'GOOGLE_CLIENT_ID' : '', !clientSecret ? 'GOOGLE_CLIENT_SECRET' : ''].filter(Boolean).join(', ');
      console.error(`[Google OAuth] Missing env variables: ${missing}`);
      redirectOAuthError(res, 'google_not_configured', `Thiếu biến môi trường ${missing} trên máy chủ.`);
      return;
    }

    const { host, origin: dynamicOrigin, isHttps, redirectUri } = resolveGoogleRedirectUri(req);

    console.log(`[Google OAuth] Initiating Sign-In flow: host=${host}, origin=${dynamicOrigin}, redirectUri=${redirectUri}`);

    // Secure CSRF state token with cryptographic signature
    const state = createSignedOAuthState(req, redirectUri);

    res.cookie('google_oauth_state', state, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    res.redirect(googleAuthUrl.toString());
  } catch (error: any) {
    console.error('[Google OAuth] Init error:', error);
    redirectOAuthError(res, 'google_init_error', error?.message || 'Lỗi khởi tạo liên kết đăng nhập Google.');
  }
});

// 11C. Handle Google OAuth Callback
const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error: googleError, error_description: googleErrorDesc } = req.query;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const storedState = req.cookies?.google_oauth_state;

    // Clear state cookie
    res.clearCookie('google_oauth_state', { path: '/' });

    if (googleError) {
      console.warn('[Google OAuth] Google returned error:', googleError, googleErrorDesc || '');
      if (typeof state === 'string' && state.startsWith('cls_')) {
        res.redirect(`/?view=classroom&google_error=${encodeURIComponent(String(googleError))}`);
        return;
      }
      redirectOAuthError(res, 'google_cancelled', String(googleErrorDesc || googleError));
      return;
    }

    // Check if callback originated from Classroom / Google Meet connect flow
    if (typeof state === 'string' && state.startsWith('cls_')) {
      const { origin: dynamicOrigin } = getRequestOriginInfo(req);
      const redirectUri = classroomService.getClassroomRedirectUri(dynamicOrigin);

      try {
        const { email } = await classroomService.handleCallback(String(code || ''), state, redirectUri);
        return res.redirect(`/?view=classroom&google=connected&email=${encodeURIComponent(email)}`);
      } catch (clsErr: any) {
        console.error('[Google OAuth] Classroom callback via auth callback failed:', clsErr);
        return res.redirect(`/?view=classroom&google_error=${encodeURIComponent(clsErr?.message || 'Kết nối Google Classroom thất bại')}`);
      }
    }

    const stateCheck = verifySignedOAuthState(String(state || ''), storedState);
    if (!stateCheck.valid) {
      console.warn('[Google OAuth] State verification failed (signature or timeout mismatch)');
      redirectOAuthError(res, 'google_state_mismatch', 'Phiên xác thực Google đã hết hạn hoặc bị sai lệch domain/cookie. Vui lòng thử lại.');
      return;
    }

    if (!code || typeof code !== 'string') {
      redirectOAuthError(res, 'google_missing_code', 'Google không trả về mã xác thực (authorization code).');
      return;
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    if (!clientId || !clientSecret) {
      redirectOAuthError(res, 'google_not_configured', 'Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET trên máy chủ.');
      return;
    }
    const { origin: dynamicOrigin, redirectUri: fallbackRedirectUri } = resolveGoogleRedirectUri(req);
    const redirectUri = stateCheck.redirectUri || fallbackRedirectUri;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData: any = await tokenResponse.json().catch(() => null);

    if (!tokenResponse.ok || !tokenData?.access_token) {
      const errCode = tokenData?.error || `HTTP_${tokenResponse.status}`;
      const errDesc = tokenData?.error_description || 'Không thể trao đổi mã xác thực với Google.';
      console.error('[Google OAuth] Token exchange failed:', { errCode, errDesc, redirectUri });
      redirectOAuthError(res, 'google_token_exchange_failed', `${errCode}: ${errDesc} (redirect_uri=${redirectUri})`);
      return;
    }

    // Fetch user profile from Google OpenID userinfo endpoint
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const profile: any = await userinfoResponse.json().catch(() => null);

    if (!userinfoResponse.ok || !profile?.email) {
      console.error('[Google OAuth] Failed to fetch userinfo:', profile);
      redirectOAuthError(res, 'google_profile_fetch_failed', 'Không thể lấy thông tin email/hồ sơ từ Google.');
      return;
    }

    const googleId = String(profile.sub || profile.id);
    const cleanEmail = String(profile.email).toLowerCase().trim();
    const fullName = String(profile.name || profile.given_name || cleanEmail.split('@')[0]).trim();
    const avatarUrl = profile.picture || null;
    const emailVerified = Boolean(profile.email_verified);

    if (!emailVerified) {
      res.redirect('/?login=google_email_unverified');
      return;
    }

    const prisma = getPrisma();

    // Find user by googleId or by verified email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: cleanEmail }
        ]
      }
    });

    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@lifeos.com').toLowerCase().trim();
    const isInitialAdmin = cleanEmail === initialAdminEmail;

    if (user) {
      // Check status
      if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
        res.redirect('/?login=account_locked');
        return;
      }

      // Link googleId or update avatar if missing, or heal SuperAdmin role
      const updates: any = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatarUrl) updates.avatar = avatarUrl;
      if (isInitialAdmin && (user.role !== 'SUPERADMIN' || user.plan === 'FREE')) {
        updates.role = 'SUPERADMIN';
        updates.plan = 'TEAM';
      } else if ((user.role === 'ADMIN' || user.role === 'SUPERADMIN') && user.plan === 'FREE') {
        updates.plan = 'TEAM';
      }
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      }
    } else {
      // Create new user authenticated via Google
      const randomUnusablePassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomUnusablePassword, 10);
      const generatedUsername = `${cleanEmail.split('@')[0]}_${crypto.randomBytes(3).toString('hex')}`.toLowerCase();

      // Calculate exact 7-Day Free Trial (7 * 24 hours from creation)
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      user = await dbService.createUser({
        name: fullName,
        email: cleanEmail,
        username: generatedUsername,
        passwordHash,
        googleId,
        role: isInitialAdmin ? 'SUPERADMIN' : 'USER',
        plan: isInitialAdmin ? 'TEAM' : 'PRO',
        status: 'ACTIVE',
        avatar: avatarUrl,
        trialStartedAt: now,
        trialEndsAt: null,
        trialUsed: true
      });

      // Automation: Dispatch welcome notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: '🎉 Chào mừng bạn gia nhập LifeOS qua Google!',
          message: 'Tài khoản của bạn đã được liên kết và khởi tạo thành công bằng tài khoản Google.',
          type: 'info',
          read: false
        }
      }).catch(e => console.warn('Google user welcome notification warning:', e));

      // Enqueue welcome email
      SystemNotificationHelper.onUserRegistered(
        { id: user.id, name: user.name, email: user.email },
        clientIp
      ).catch(e => console.warn('[EmailQueue] Error enqueuing registration notification:', e));
    }

    // Issue standard JWT Token (14 days validity) matching standard authentication
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, jti: crypto.randomUUID() },
      getJwtSecret(),
      { expiresIn: '14d' }
    );

    // Save session in PostgreSQL database
    const sessionExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    await dbService.createSession(user.id, token, sessionExpiry);

    // Set secure HTTP-only cookie
    setSessionCookie(req, res, token);

    await dbService.createAuditLog(
      user.id,
      'USER_GOOGLE_LOGIN',
      'users',
      user.id,
      null,
      { email: user.email, googleId, ip: clientIp }
    );

    const targetOrigin = stateCheck.origin || dynamicOrigin;
    res.redirect(`${targetOrigin}/?login=google_success&token=${encodeURIComponent(token)}`);
  } catch (error: any) {
    console.error('[Google OAuth] Callback error:', error);
    redirectOAuthError(res, 'google_server_error', error?.message || 'Lỗi máy chủ khi hoàn tất phiên Google OAuth.');
  }
};

authRouter.get('/google/callback', handleGoogleCallback);
authRouter.get('/callback/google', handleGoogleCallback);

// 11D. Google One-Tap / GIS Client-Side ID Token Verification
authRouter.post('/google/credential', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    if (!credential || typeof credential !== 'string') {
      res.status(400).json({ success: false, message: 'Google Credential Token là bắt buộc.' });
      return;
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();

    // Verify token with Google public endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload: any = await verifyRes.json();

    if (!verifyRes.ok || !payload?.email) {
      res.status(401).json({ success: false, message: 'Google Token không hợp lệ hoặc đã hết hạn.' });
      return;
    }

    // Verify audience matches our Client ID if configured
    if (clientId && payload.aud !== clientId) {
      res.status(403).json({ success: false, message: 'Token Google không thuộc ứng dụng này (Audience mismatch).' });
      return;
    }

    if (!payload.email_verified) {
      res.status(400).json({ success: false, message: 'Email Google chưa được xác thực.' });
      return;
    }

    const googleId = String(payload.sub);
    const cleanEmail = String(payload.email).toLowerCase().trim();
    const fullName = String(payload.name || cleanEmail.split('@')[0]).trim();
    const avatarUrl = payload.picture || null;

    const prisma = getPrisma();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: cleanEmail }
        ]
      }
    });

    if (user) {
      if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
        res.status(403).json({ success: false, message: 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Admin.' });
        return;
      }

      const updates: any = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatarUrl) updates.avatar = avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates
        });
      }
    } else {
      const randomPass = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPass, 10);
      const generatedUsername = `${cleanEmail.split('@')[0]}_${crypto.randomBytes(3).toString('hex')}`.toLowerCase();

      // Calculate exact 7-Day Free Trial (7 * 24 hours from creation)
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      user = await dbService.createUser({
        name: fullName,
        email: cleanEmail,
        username: generatedUsername,
        passwordHash,
        googleId,
        role: 'USER',
        plan: 'PRO',
        status: 'ACTIVE',
        avatar: avatarUrl,
        trialStartedAt: now,
        trialEndsAt: null,
        trialUsed: true
      });

      SystemNotificationHelper.onUserRegistered(
        { id: user.id, name: user.name, email: user.email },
        clientIp
      ).catch(e => console.warn('[EmailQueue] Error enqueuing registration notification:', e));
    }

    // Issue standard JWT Token (14 days validity) matching standard authentication
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, jti: crypto.randomUUID() },
      getJwtSecret(),
      { expiresIn: '14d' }
    );

    const sessionExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await dbService.createSession(user.id, token, sessionExpiry);
    setSessionCookie(req, res, token);

    await dbService.createAuditLog(
      user.id,
      'USER_GOOGLE_LOGIN',
      'users',
      user.id,
      null,
      { email: user.email, googleId, ip: clientIp }
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
      message: 'Đăng nhập Google thành công',
      user: safeUser,
      token
    });
  } catch (error: any) {
    console.error('Google credential login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xác thực Google: ' + error.message });
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

// --------------------------------------------------------------------------
// ADMIN-APPROVED PASSWORD RESET FLOW (No SMTP Required)
// --------------------------------------------------------------------------

// Helper to generate a unique short ticket code like RST-8392
async function generateUniqueTicketCode(prisma: any): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `RST-${num}`;
    const exists = await prisma.passwordResetRequest.findUnique({
      where: { ticketCode: code }
    });
    if (!exists) return code;
  }
  return `RST-${Math.floor(10000 + Math.random() * 90000)}`;
}

// 1. Submit or Resume a Password Reset Request
authRouter.post('/reset-request', passwordResetRateLimiter, validateBody(PasswordResetRequestSchema), async (req: Request, res: Response) => {
  try {
    const { email, verificationNote, claimToken } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const prisma = getPrisma();

    // Verify user exists
    const user = await dbService.findUserByEmail(cleanEmail);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy tài khoản với email này trong hệ thống.' },
        message: 'Không tìm thấy tài khoản với email này trong hệ thống.'
      });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản của bạn đang bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ Quản trị viên.' },
        message: 'Tài khoản của bạn đang bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ Quản trị viên.'
      });
      return;
    }

    // Check for existing active (PENDING or APPROVED) requests for this user
    const existingRequest = await prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingRequest) {
      // Check if existing APPROVED request has expired
      if (existingRequest.status === 'APPROVED' && existingRequest.expiresAt && new Date(existingRequest.expiresAt).getTime() < Date.now()) {
        await prisma.passwordResetRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'EXPIRED' }
        });
      } else {
        // If user already holds the claim token for this active session, resume it
        if (claimToken) {
          const sentHash = crypto.createHash('sha256').update(String(claimToken).trim()).digest('hex');
          if (sentHash === existingRequest.claimTokenHash) {
            res.json({
              success: true,
              resumed: true,
              ticketCode: existingRequest.ticketCode,
              claimToken: String(claimToken).trim(),
              status: existingRequest.status,
              expiresAt: existingRequest.expiresAt,
              message: 'Đã khôi phục phiên yêu cầu khôi phục mật khẩu đang hoạt động của bạn.'
            });
            return;
          }
        }

        // If user is opening a new request on another device or overwriting, expire the previous pending request
        await prisma.passwordResetRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'EXPIRED' }
        });
      }
    }

    // Generate new Session-Bound Claim Token
    const rawClaimToken = crypto.randomBytes(32).toString('hex');
    const claimTokenHash = crypto.createHash('sha256').update(rawClaimToken).digest('hex');
    const ticketCode = await generateUniqueTicketCode(prisma);

    const newRequest = await prisma.passwordResetRequest.create({
      data: {
        ticketCode,
        userId: user.id,
        email: cleanEmail,
        verificationNote: verificationNote ? String(verificationNote).trim().slice(0, 500) : null,
        claimTokenHash,
        status: 'PENDING'
      }
    });

    // Notify admins of new pending reset request
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { id: true }
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: `Yêu cầu khôi phục mật khẩu: ${ticketCode}`,
            message: `Người dùng ${cleanEmail} vừa gửi yêu cầu khôi phục mật khẩu (${ticketCode}). Vui lòng vào trang Quản trị để duyệt.`,
            type: 'Info',
            read: false
          }))
        });
      }
    } catch (notifErr) {
      console.warn('Admin notification creation warning:', notifErr);
    }

    await dbService.createAuditLog(
      user.id,
      'PASSWORD_RESET_REQUEST_CREATED',
      'password_reset_requests',
      newRequest.id,
      null,
      { ticketCode, email: cleanEmail }
    );

    res.json({
      success: true,
      ticketCode,
      claimToken: rawClaimToken,
      status: 'PENDING',
      message: 'Yêu cầu khôi phục mật khẩu đã được gửi thành công. Vui lòng giữ màn hình hoặc ghi nhớ mã yêu cầu để chờ Admin phê duyệt.'
    });
  } catch (err: any) {
    console.error('POST /api/auth/reset-request error:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi gửi yêu cầu khôi phục mật khẩu' });
  }
});

// 2. Poll Status or Verify Session / Backup PIN
authRouter.post('/reset-status', async (req: Request, res: Response) => {
  try {
    const { ticketCode, email, claimToken, backupPin } = req.body;
    const prisma = getPrisma();

    let request = null;
    if (ticketCode) {
      request = await prisma.passwordResetRequest.findUnique({
        where: { ticketCode: String(ticketCode).trim().toUpperCase() }
      });
    } else if (email) {
      request = await prisma.passwordResetRequest.findFirst({
        where: {
          email: String(email).toLowerCase().trim(),
          status: { in: ['PENDING', 'APPROVED'] }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!request) {
      res.status(404).json({
        success: false,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Không tìm thấy thông tin yêu cầu khôi phục mật khẩu.' },
        message: 'Không tìm thấy thông tin yêu cầu khôi phục mật khẩu.'
      });
      return;
    }

    // Check expiration on APPROVED requests (30-minute window)
    if (request.status === 'APPROVED' && request.expiresAt && new Date(request.expiresAt).getTime() < Date.now()) {
      request = await prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' }
      });
    }

    // Security check: Verify Claim Token (browser bound) or Backup PIN (admin provided)
    let isAuthorized = false;
    let authMethod: 'CLAIM_TOKEN' | 'BACKUP_PIN' | null = null;

    if (claimToken) {
      const hash = crypto.createHash('sha256').update(String(claimToken).trim()).digest('hex');
      if (hash === request.claimTokenHash) {
        isAuthorized = true;
        authMethod = 'CLAIM_TOKEN';
      }
    }

    if (!isAuthorized && backupPin && request.backupPin) {
      if (String(backupPin).trim() === request.backupPin.trim()) {
        isAuthorized = true;
        authMethod = 'BACKUP_PIN';
      }
    }

    const isExpired = request.status === 'EXPIRED' || (request.expiresAt && new Date(request.expiresAt).getTime() < Date.now());
    const canSetNewPassword = isAuthorized && request.status === 'APPROVED' && !isExpired;

    res.json({
      success: true,
      ticketCode: request.ticketCode,
      email: request.email,
      status: request.status,
      isAuthorized,
      authMethod,
      canSetNewPassword,
      expiresAt: request.expiresAt,
      approvedAt: request.approvedAt,
      createdAt: request.createdAt,
      message: canSetNewPassword
        ? 'Yêu cầu đã được phê duyệt! Bạn có thể đặt mật khẩu mới ngay.'
        : request.status === 'PENDING'
        ? 'Đang chờ Quản trị viên phê duyệt...'
        : request.status === 'REJECTED'
        ? 'Yêu cầu khôi phục của bạn đã bị từ chối bởi Quản trị viên.'
        : isExpired
        ? 'Phiên phê duyệt đã hết hạn sau 30 phút. Vui lòng tạo yêu cầu mới.'
        : !isAuthorized
        ? 'Bạn chưa được xác thực trên thiết bị này. Vui lòng sử dụng đúng trình duyệt đã gửi yêu cầu hoặc nhập Mã PIN 6 số do Admin cung cấp.'
        : 'Trạng thái yêu cầu: ' + request.status
    });
  } catch (err: any) {
    console.error('POST /api/auth/reset-status error:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi kiểm tra trạng thái' });
  }
});

// 3. User cancels pending request
authRouter.post('/reset-cancel', async (req: Request, res: Response) => {
  try {
    const { ticketCode, claimToken } = req.body;
    const prisma = getPrisma();

    if (!ticketCode) {
      res.status(400).json({ success: false, message: 'Thiếu mã yêu cầu' });
      return;
    }

    const request = await prisma.passwordResetRequest.findUnique({
      where: { ticketCode: String(ticketCode).trim().toUpperCase() }
    });

    if (!request) {
      res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
      return;
    }

    // Verify token
    if (claimToken) {
      const hash = crypto.createHash('sha256').update(String(claimToken).trim()).digest('hex');
      if (hash !== request.claimTokenHash) {
        res.status(403).json({ success: false, message: 'Token xác thực không hợp lệ' });
        return;
      }
    }

    await prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { status: 'EXPIRED' }
    });

    res.json({
      success: true,
      message: 'Đã hủy yêu cầu khôi phục mật khẩu thành công.'
    });
  } catch (err: any) {
    console.error('POST /api/auth/reset-cancel error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Confirm Reset & Set New Password
authRouter.post('/reset-confirm', passwordResetRateLimiter, validateBody(PasswordResetConfirmSchema), async (req: Request, res: Response) => {
  try {
    const { ticketCode, claimToken, backupPin, newPassword } = req.body;
    const prisma = getPrisma();

    const request = await prisma.passwordResetRequest.findUnique({
      where: { ticketCode: String(ticketCode).trim().toUpperCase() }
    });

    if (!request) {
      res.status(404).json({
        success: false,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Không tìm thấy yêu cầu khôi phục mật khẩu.' },
        message: 'Không tìm thấy yêu cầu khôi phục mật khẩu.'
      });
      return;
    }

    if (request.status === 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_COMPLETED', message: 'Yêu cầu khôi phục này đã được sử dụng thành công trước đó.' },
        message: 'Yêu cầu khôi phục này đã được sử dụng thành công trước đó.'
      });
      return;
    }

    if (request.status === 'REJECTED') {
      res.status(400).json({
        success: false,
        error: { code: 'REQUEST_REJECTED', message: 'Yêu cầu này đã bị Quản trị viên từ chối.' },
        message: 'Yêu cầu này đã bị Quản trị viên từ chối.'
      });
      return;
    }

    if (request.status !== 'APPROVED') {
      res.status(400).json({
        success: false,
        error: { code: 'NOT_APPROVED', message: 'Yêu cầu này chưa được Quản trị viên phê duyệt.' },
        message: 'Yêu cầu này chưa được Quản trị viên phê duyệt.'
      });
      return;
    }

    // Check expiration (30 minutes window)
    if (request.expiresAt && new Date(request.expiresAt).getTime() < Date.now()) {
      await prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' }
      });
      res.status(400).json({
        success: false,
        error: { code: 'REQUEST_EXPIRED', message: 'Phiên phê duyệt đã quá thời hạn 30 phút. Vui lòng tạo yêu cầu mới.' },
        message: 'Phiên phê duyệt đã quá thời hạn 30 phút. Vui lòng tạo yêu cầu mới.'
      });
      return;
    }

    // Security Verification: Claim Token OR Backup PIN
    let isAuthorized = false;
    let authMethod = 'CLAIM_TOKEN';

    if (claimToken) {
      const hash = crypto.createHash('sha256').update(String(claimToken).trim()).digest('hex');
      if (hash === request.claimTokenHash) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && backupPin && request.backupPin) {
      if (String(backupPin).trim() === request.backupPin.trim()) {
        isAuthorized = true;
        authMethod = 'BACKUP_PIN';
      }
    }

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_DEVICE', message: 'Xác thực bảo mật thất bại! Trình duyệt này không khớp với yêu cầu hoặc mã PIN không chính xác.' },
        message: 'Xác thực bảo mật thất bại! Trình duyệt này không khớp với yêu cầu hoặc mã PIN không chính xác.'
      });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);

    // Atomically update user password, mark request COMPLETED, and invalidate all existing sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      }),
      // Revoke all active sessions for security
      prisma.session.deleteMany({
        where: { userId: request.userId }
      })
    ]);

    await dbService.createAuditLog(
      request.userId,
      'ADMIN_APPROVED_PASSWORD_RESET_COMPLETED',
      'users',
      request.userId,
      null,
      { ticketCode: request.ticketCode, email: request.email, authMethod }
    );

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay.'
    });
  } catch (err: any) {
    console.error('POST /api/auth/reset-confirm error:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi cập nhật mật khẩu mới' });
  }
});


