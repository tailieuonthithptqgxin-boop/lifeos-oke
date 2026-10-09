import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Robust CSRF & Origin Verification Middleware
 * Validates Origin / Referer on all mutating HTTP methods (POST, PUT, PATCH, DELETE).
 * Protects against cross-site request forgery attacks.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe read-only methods pass through
  if (SAFE_METHODS.has(req.method)) {
    // Generate and set CSRF cookie if not present
    if (!req.cookies?.['lifeos_csrf']) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('lifeos_csrf', token, {
        httpOnly: false, // Accessible to client-side JS to send in X-CSRF-Token header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    next();
    return;
  }

  // 1. Origin / Referer Validation for Mutations
  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;
  const host = req.headers['host'];

  if (origin) {
    try {
      const originUrl = new URL(origin);
      const isLocal = originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
      const isSameHost = host && (originUrl.host === host || originUrl.hostname === host.split(':')[0]);
      const isCloudRun = originUrl.hostname.endsWith('.run.app') || originUrl.hostname.endsWith('.pages.dev');

      if (!isLocal && !isSameHost && !isCloudRun) {
        // Check if APP_URL is defined
        if (process.env.APP_URL) {
          const appUrl = new URL(process.env.APP_URL);
          if (originUrl.host !== appUrl.host) {
            res.status(403).json({
              success: false,
              error: {
                code: 'CSRF_ORIGIN_REJECTED',
                message: 'Yêu cầu bị từ chối vì nguồn gốc (Origin) không hợp lệ.',
              },
              message: 'Yêu cầu bị từ chối vì nguồn gốc không hợp lệ.',
            });
            return;
          }
        }
      }
    } catch (e) {
      res.status(403).json({
        success: false,
        error: { code: 'CSRF_INVALID_ORIGIN', message: 'Header Origin không hợp lệ.' },
      });
      return;
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      const isLocal = refererUrl.hostname === 'localhost' || refererUrl.hostname === '127.0.0.1';
      const isSameHost = host && (refererUrl.host === host || refererUrl.hostname === host.split(':')[0]);
      const isCloudRun = refererUrl.hostname.endsWith('.run.app') || refererUrl.hostname.endsWith('.pages.dev');

      if (!isLocal && !isSameHost && !isCloudRun && process.env.APP_URL) {
        const appUrl = new URL(process.env.APP_URL);
        if (refererUrl.host !== appUrl.host) {
          res.status(403).json({
            success: false,
            error: {
              code: 'CSRF_REFERER_REJECTED',
              message: 'Yêu cầu bị từ chối vì nguồn giới thiệu (Referer) không hợp lệ.',
            },
            message: 'Yêu cầu bị từ chối vì nguồn giới thiệu không hợp lệ.',
          });
          return;
        }
      }
    } catch (e) {
      res.status(403).json({
        success: false,
        error: { code: 'CSRF_INVALID_REFERER', message: 'Header Referer không hợp lệ.' },
      });
      return;
    }
  }

  // 2. Token verification if cookie is present (mutation request)
  const cookieToken = req.cookies?.['lifeos_csrf'];
  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  // SEC-002 FIX: If CSRF cookie exists, the header token is MANDATORY and must match.
  // Previously, missing header would silently skip this check — enabling CSRF attacks.
  if (cookieToken) {
    if (!headerToken) {
      res.status(403).json({
        success: false,
        error: { code: 'CSRF_TOKEN_MISSING', message: 'Yêu cầu thiếu CSRF Token. Vui lòng thử lại từ giao diện ứng dụng.' },
        message: 'Yêu cầu thiếu CSRF Token.',
      });
      return;
    }
    if (cookieToken !== headerToken) {
      res.status(403).json({
        success: false,
        error: { code: 'CSRF_TOKEN_MISMATCH', message: 'Mã xác thực CSRF Token không hợp lệ.' },
        message: 'Mã xác thực CSRF Token không hợp lệ.',
      });
      return;
    }
  }

  next();
}
