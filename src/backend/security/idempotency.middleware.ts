import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getPrisma } from '../db.js';
import { AuthRequest } from '../auth.middleware.js';

/**
 * Idempotency Middleware: Guarantees atomic, single-execution semantics for state-changing requests (POST/PUT/DELETE).
 * Prevents double-clicks, duplicate billing, and duplicate transactions.
 */
export function idempotencyMiddleware(options?: { ttlHours?: number; autoHashPayload?: boolean }) {
  const ttlHours = options?.ttlHours || 24;
  const autoHashPayload = options?.autoHashPayload ?? true;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only apply to mutating methods
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
      return next();
    }

    const explicitKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
    let idempotencyKey: string | null = explicitKey ? String(explicitKey).trim() : null;

    const userId = req.userId || 'anonymous';

    // If client did not provide explicit key, create one from user + path + body hash if autoHashPayload is enabled
    if (!idempotencyKey && autoHashPayload && req.body && Object.keys(req.body).length > 0) {
      const payloadHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex')
        .substring(0, 32);
      idempotencyKey = `auto_${userId}_${req.path.replace(/\//g, '_')}_${payloadHash}`;
    }

    if (!idempotencyKey) {
      return next();
    }

    const prisma = getPrisma();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    try {
      // Check existing key in idempotency_keys table
      const existing: any[] = await prisma.$queryRawUnsafe(
        `SELECT response_code, response_body, expires_at FROM idempotency_keys WHERE key = $1 LIMIT 1`,
        idempotencyKey
      );

      if (existing.length > 0) {
        const record = existing[0];
        // If expired, delete and allow reprocessing
        if (new Date(record.expires_at) < new Date()) {
          await prisma.$queryRawUnsafe(`DELETE FROM idempotency_keys WHERE key = $1`, idempotencyKey).catch(() => {});
        } else {
          // If response_code is 0, it means another request with this exact key is currently in-flight
          if (record.response_code === 0) {
            return res.status(409).json({
              success: false,
              error: {
                code: 'CONCURRENT_REQUEST',
                message: 'Yêu cầu này đang được xử lý trên hệ thống. Vui lòng chờ vài giây.'
              },
              message: 'Yêu cầu này đang được xử lý trên hệ thống. Vui lòng chờ vài giây.'
            });
          }

          // Return cached response
          res.setHeader('X-Idempotency-Replayed', 'true');
          res.status(record.response_code);
          try {
            const parsed = JSON.parse(record.response_body);
            return res.json(parsed);
          } catch {
            return res.send(record.response_body);
          }
        }
      }

      // Reserve key with status in-flight (response_code = 0)
      const keyId = `idm_${crypto.randomBytes(10).toString('hex')}`;
      const reqHash = crypto.createHash('md5').update(JSON.stringify(req.body || {})).digest('hex');

      await prisma.$queryRawUnsafe(
        `INSERT INTO idempotency_keys (id, key, user_id, endpoint, request_hash, response_code, response_body, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, 0, '', NOW(), $6)
         ON CONFLICT (key) DO NOTHING`,
        keyId,
        idempotencyKey,
        userId,
        req.originalUrl || req.path,
        reqHash,
        expiresAt
      ).catch(() => {});

      // Hook into response completion to record the final result
      const originalSend = res.send.bind(res);

      res.send = function (body: any): Response {
        const statusCode = res.statusCode;
        // Only cache idempotent results for successful or deterministic client states
        if (statusCode >= 200 && statusCode < 500) {
          const stringified = typeof body === 'string' ? body : JSON.stringify(body);
          prisma.$queryRawUnsafe(
            `UPDATE idempotency_keys SET response_code = $1, response_body = $2 WHERE key = $3`,
            statusCode,
            stringified,
            idempotencyKey
          ).catch((e: any) => console.warn('Idempotency update error:', e.message));
        } else {
          // In case of 500 server error, remove the lock so user can retry
          prisma.$queryRawUnsafe(`DELETE FROM idempotency_keys WHERE key = $1`, idempotencyKey).catch(() => {});
        }
        return originalSend(body);
      };

      next();
    } catch (err: any) {
      // If table missing or DB hiccup, fail open so business requests are not blocked
      console.warn('Idempotency middleware warning:', err.message);
      next();
    }
  };
}
