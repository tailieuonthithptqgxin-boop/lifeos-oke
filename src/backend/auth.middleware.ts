import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbService, isDbConnectionError } from './db.js';

import crypto from 'crypto';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userPlan?: string;
  user?: any;
  subscription?: any;
}

// Stable, permanent fallback secret ensures node restarts/rebuilds never invalidate client JWT tokens
const PERMANENT_FALLBACK_JWT_SECRET = 'lifeos_enterprise_permanent_secure_jwt_secret_key_2026_salt_9988_robust';
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || PERMANENT_FALLBACK_JWT_SECRET;
}

/**
 * Robust authentication middleware:
 * Validates JWT token signature AND verifies/auto-heals active database session
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
    // 3. Verify session exists in PostgreSQL database, or auto-heal if valid JWT & active user
    let session = await dbService.findSessionByToken(token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      // Auto-heal session in database if user is valid and active
      const user = await dbService.findUserById(decoded.userId);
      if (user && user.status !== 'DISABLED' && user.status !== 'SUSPENDED') {
        const extendedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        try {
          await dbService.createSession(user.id, token, extendedExpiresAt);
          session = { userId: user.id, token, expiresAt: extendedExpiresAt };
        } catch {
          // If unique constraint or transient DB conflict, permit session based on cryptographically validated JWT
          session = { userId: user.id, token, expiresAt: extendedExpiresAt };
        }
      } else {
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
    // If the database connection was momentarily dropped or busy, NEVER destroy user session with 401
    if (isDbConnectionError(dbErr)) {
      console.warn('Database connection temporarily unavailable in requireAuth:', dbErr.message || dbErr);
      res.status(503).json({
        success: false,
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Hệ thống cơ sở dữ liệu đang bận. Đang thử kết nối lại...' },
        message: 'Hệ thống cơ sở dữ liệu đang bận. Đang thử kết nối lại...'
      });
      return;
    }

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

    // Clear stale or corrupted cookie on permanent auth verification failure so client does not get stuck
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
  if (!user) return false;
  // 100% Free-to-use mode: All features are completely unlocked for all users
  return true;
}

export const requireFeature = (feature: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // 100% Free-to-use mode: Bypass all feature gates
    next();
  };
};

/**
 * Universal Subscription Gate Middleware:
 * Enforces that non-admin users must have an ACTIVE, non-expired subscription (Personal or Team member).
 * In 100% Free-to-use mode, every authenticated user is granted Full Access immediately.
 */
export const requireActiveSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  req.subscription = {
    hasAccess: true,
    lifecycleStatus: 'ACTIVE',
    planId: 'FREE_FULL_ACCESS',
    planName: 'Trải nghiệm Miễn phí (Full Access)',
    status: 'ACTIVE',
    remainingDays: 99999,
    isGlobalFreeMode: true
  };
  return next();
};
