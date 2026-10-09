import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly max: number;
  private readonly message: string;

  constructor(windowMs: number, max: number, message: string) {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;

    // Periodically clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  public middleware(keyGenerator?: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                       req.socket.remoteAddress || 
                       'unknown_ip';

      const key = keyGenerator ? keyGenerator(req) : `${clientIp}`;
      const record = this.store.get(key);

      if (!record || now > record.resetTime) {
        this.store.set(key, {
          count: 1,
          resetTime: now + this.windowMs,
        });
        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', this.max - 1);
        next();
        return;
      }

      if (record.count >= this.max) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', 0);

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: this.message,
            retryAfterSeconds: retryAfter,
          },
          message: this.message,
        });
        return;
      }

      record.count += 1;
      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', this.max - record.count);
      next();
    };
  }
}

// 1. Login / Register: 10 attempts per 15 mins per IP + account identifier
export const authRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  10,
  'Quá nhiều yêu cầu xác thực từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.'
).middleware((req) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'ip';
  const id = (req.body?.email || req.body?.identifier || req.body?.username || '').toLowerCase().trim();
  return `auth_${ip}_${id}`;
});

// 2. Password Reset / Change Password: 15 attempts per 15 mins per IP + action
export const passwordResetRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  process.env.NODE_ENV === 'test' ? 100 : 15,
  'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 15 phút.'
).middleware((req) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'ip';
  return `pwd_${ip}_${req.path}`;
});

// 3. Payment / Checkout: 25 attempts per 10 mins
export const paymentRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1000,
  25,
  'Thao tác thanh toán quá nhanh. Vui lòng chờ vài phút trước khi tiếp tục.'
).middleware((req: any) => {
  const userId = req.userId || req.user?.id || 'guest';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'ip';
  return `pay_${ip}_${userId}`;
});

// 4. Coupon validation: 20 checks per 10 mins
export const couponRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1000,
  20,
  'Bạn đã kiểm tra mã giảm giá quá nhiều lần. Vui lòng thử lại sau.'
).middleware((req: any) => {
  const userId = req.userId || req.user?.id || 'guest';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'ip';
  return `coupon_${ip}_${userId}`;
});

// 5. File upload / presigned URL: 40 uploads per 10 mins
export const uploadRateLimiter = new MemoryRateLimiter(
  10 * 60 * 1000,
  40,
  'Tần suất tải lên tập tin quá cao. Vui lòng đợi trong giây lát.'
).middleware((req: any) => {
  const userId = req.userId || req.user?.id || 'guest';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'ip';
  return `upload_${ip}_${userId}`;
});
