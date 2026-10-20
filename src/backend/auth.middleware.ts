import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from './db.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userPlan?: string;
  user?: any;
  subscription?: any;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
    }
    return 'dev_lifeos_secure_jwt_secret_key_2026';
  }
  return secret;
}

/**
 * Robust authentication middleware:
 * Validates JWT token signature AND verifies active database session
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1. Extract token from Authorization Bearer header or HttpOnly cookie fallback
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = bearerToken || req.cookies?.token;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.'
      },
      message: 'Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.'
    });
    return;
  }

  // 2. Verify JWT signature
  let decoded: { userId: string; role: string; email: string };
  try {
    decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role: string; email: string };
  } catch (jwtErr: any) {
    // Clear stale cookie
    res.clearCookie('token', { path: '/' });
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
      },
      message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
    });
    return;
  }

  if (!decoded || !decoded.userId) {
    res.clearCookie('token', { path: '/' });
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ.' },
      message: 'Token không hợp lệ.'
    });
    return;
  }

  try {
    // 3. Verify session exists in PostgreSQL database and is not expired/revoked
    const session = await dbService.findSessionByToken(token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      res.clearCookie('token', { path: '/' });
      res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_REVOKED',
          message: 'Phiên làm việc đã kết thúc hoặc bị hủy. Vui lòng đăng nhập lại.'
        },
        message: 'Phiên làm việc đã kết thúc hoặc bị hủy. Vui lòng đăng nhập lại.'
      });
      return;
    }

    // 4. Retrieve fresh user state
    const user = await dbService.findUserById(decoded.userId);
    if (!user) {
      await dbService.deleteSession(token);
      res.clearCookie('token', { path: '/' });
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Tài khoản không tồn tại hoặc đã bị xóa.' },
        message: 'Tài khoản không tồn tại hoặc đã bị xóa.'
      });
      return;
    }

    // 5. Account status enforcement
    if (user.status === 'DISABLED') {
      await dbService.deleteSession(token);
      res.clearCookie('token', { path: '/' });
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.' },
        message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.'
      });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.' },
        message: 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Quản trị viên.'
      });
      return;
    }

    // 6. Check plan expiration (if any)
    if (user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now() && user.plan !== 'FREE') {
      // Expired plan reverts to FREE
      await dbService.updateUser(user.id, { plan: 'FREE', planExpiresAt: null });
      user.plan = 'FREE';
    }

    req.userId = user.id;
    req.userRole = user.role;
    req.userPlan = user.plan;
    req.user = user;
    next();
  } catch (dbErr: any) {
    // If table is missing (P2021), attempt one-time auto-synchronization and retry
    if (dbErr?.code === 'P2021') {
      try {
        console.warn('requireAuth: Missing database relation detected (P2021). Attempting schema auto-sync...');
        const { checkDbConnection } = await import('./db.js');
        await checkDbConnection();
        // Retry session check
        const retrySession = await dbService.findSessionByToken(token);
        if (retrySession && retrySession.user && new Date(retrySession.expiresAt).getTime() > Date.now()) {
          req.userId = retrySession.user.id;
          req.userRole = retrySession.user.role;
          req.userPlan = retrySession.user.plan;
          req.user = retrySession.user;
          return next();
        }
      } catch (retryErr: any) {
        console.error('requireAuth auto-sync retry failed:', retryErr.message || retryErr);
      }
    }

    // Clear stale or corrupted cookie on auth verification failure so client does not get stuck
    res.clearCookie('token', { path: '/' });
    console.warn('Session verification failed in requireAuth:', dbErr.message || dbErr);
    res.status(401).json({
      success: false,
      error: { code: 'SESSION_INVALID', message: 'Phiên làm việc không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' },
      message: 'Phiên làm việc không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.userRole?.toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN_ADMIN_ONLY', message: 'Truy cập bị từ chối: Cần quyền Quản trị viên.' },
      message: 'Truy cập bị từ chối: Cần quyền Quản trị viên.'
    });
    return;
  }
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.userRole?.toUpperCase();
  if (role !== 'SUPERADMIN') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN_SUPERADMIN_ONLY', message: 'Truy cập bị từ chối: Cần quyền SuperAdmin.' },
      message: 'Truy cập bị từ chối: Cần quyền SuperAdmin.'
    });
    return;
  }
  next();
};

/**
 * Feature Entitlement Rule Engine:
 * Validates whether user is allowed to access specific feature based on their plan and role.
 */
export function canUse(user: { plan?: string; role?: string }, feature: string): boolean {
  const role = (user.role || 'USER').toUpperCase();
  const plan = (user.plan || 'FREE').toUpperCase();

  // Admins have access to all features
  if (role === 'SUPERADMIN' || role === 'ADMIN') return true;

  // Global Free Trial accounts have full access to all features
  if (plan === 'FREE_TRIAL_GLOBAL') return true;

  // Unsubscribed or FREE accounts cannot use features
  if (plan === 'FREE' || !plan) return false;

  // Team workspace management specifically for team subscribers
  if (feature === 'TEAM_WORKSPACE' || feature === 'TEAM_COLLABORATION' || feature === 'TEAM_REPORTS') {
    return plan === 'TEAM_1M' || plan === 'TEAM';
  }

  // All other features (Decision Engine, Automation, Finance, Kanban, Focus, etc.) are equally accessible to all paid plans
  return true;
}

export const requireFeature = (feature: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !canUse(req.user, feature)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: `Tính năng '${feature}' yêu cầu tài khoản đã kích hoạt gói dịch vụ.`
        },
        message: `Tính năng '${feature}' yêu cầu tài khoản đã kích hoạt gói dịch vụ.`
      });
      return;
    }
    next();
  };
};

/**
 * Universal Subscription Gate Middleware:
 * Enforces that non-admin users must have an ACTIVE, non-expired subscription (Personal or Team member).
 */
export const requireActiveSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.userRole?.toUpperCase();
  if (role === 'ADMIN' || role === 'SUPERADMIN') {
    return next();
  }

  try {
    const { subscriptionService } = await import('./services/subscription.service.js');
    const subStatus = await subscriptionService.checkUserSubscription(req.userId!);

    if (!subStatus.hasAccess) {
      const isTrialExp = Boolean(subStatus.isTrialExpired);
      const code = isTrialExp ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_REQUIRED';
      const msg = isTrialExp
        ? 'Thời gian dùng thử 7 ngày miễn phí của bạn đã kết thúc. Vui lòng kích hoạt gói dịch vụ để tiếp tục sử dụng các phân hệ cao cấp của LifeOS.'
        : 'Tất cả các chức năng của LifeOS yêu cầu người dùng mua gói trả phí đang hoạt động. Vui lòng chọn gói dịch vụ để tiếp tục sử dụng.';

      res.status(403).json({
        success: false,
        error: {
          code,
          message: msg
        },
        message: msg,
        subscriptionStatus: subStatus
      });
      return;
    }

    req.subscription = subStatus;
    next();
  } catch (err: any) {
    console.error('requireActiveSubscription error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SUBSCRIPTION_CHECK_ERROR', message: 'Lỗi kiểm tra quyền gói dịch vụ.' },
      message: 'Lỗi kiểm tra quyền gói dịch vụ.'
    });
  }
};
