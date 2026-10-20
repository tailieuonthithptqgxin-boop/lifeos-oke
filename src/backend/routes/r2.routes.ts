import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { r2Service } from '../services/r2.service.js';
import { uploadRateLimiter } from '../security/rateLimiter.js';

export const r2Router = Router();

import { validateUploadedBuffer } from '../security/fileSecurity.js';

// Helper to check admin privileges
function checkIsAdmin(user: any): boolean {
  const role = (user?.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
}

// GET /api/r2/status - Get R2 connection status
r2Router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const status = r2Service.getStatus();
    let testResult = null;
    if (status.configured) {
      testResult = await r2Service.testConnection();
    }
    res.json({
      success: true,
      status,
      testResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/r2/presigned-url - Get presigned URL for direct browser upload to R2
r2Router.post('/presigned-url', requireAuth, uploadRateLimiter, async (req: AuthRequest, res: Response) => {
  const { fileName, mimeType, folder } = req.body;
  if (!fileName) {
    res.status(400).json({ success: false, message: 'Tên file (fileName) là bắt buộc.' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không thể xác thực danh tính người dùng.' });
    return;
  }

  try {
    const result = await r2Service.getPresignedUploadUrl(
      String(fileName),
      mimeType || 'application/octet-stream',
      userId,
      folder || 'uploads'
    );
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/r2/upload-base64 - Direct base64 image/file upload endpoint
r2Router.post('/upload-base64', requireAuth, uploadRateLimiter, async (req: AuthRequest, res: Response) => {
  const { base64Data, fileName, mimeType, folder } = req.body;
  if (!base64Data || !fileName) {
    res.status(400).json({ success: false, message: 'base64Data và fileName là bắt buộc.' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không thể xác thực danh tính người dùng.' });
    return;
  }

  try {
    // Strip data URL header if present (e.g., "data:image/png;base64,...")
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Deep Magic Bytes & MIME verification
    const validation = validateUploadedBuffer(buffer, String(fileName), mimeType || 'image/png');
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_SECURITY_REJECTED', message: validation.error },
        message: validation.error
      });
    }

    const result = await r2Service.uploadFile(
      buffer,
      validation.safeFileName,
      validation.detectedMime,
      userId,
      folder || 'uploads'
    );

    res.json({
      success: true,
      message: 'Tải tập tin lên Cloudflare R2 thành công!',
      file: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/r2/files - List bucket files (User isolated to their own namespace, Admin can inspect others)
r2Router.get('/files', requireAuth, async (req: AuthRequest, res: Response) => {
  const prefix = (req.query.prefix as string) || '';
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không thể xác thực danh tính người dùng.' });
    return;
  }

  const isAdmin = checkIsAdmin(req.user);

  try {
    const files = await r2Service.listFiles(userId, isAdmin, prefix);
    res.json({
      success: true,
      files
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/r2/metadata - Get file metadata
r2Router.get('/metadata', requireAuth, async (req: AuthRequest, res: Response) => {
  const key = (req.query.key || req.body?.key) as string;
  if (!key) {
    res.status(400).json({ success: false, message: 'Khóa tập tin (key) là bắt buộc.' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không thể xác thực danh tính người dùng.' });
    return;
  }

  const isAdmin = checkIsAdmin(req.user);

  try {
    const meta = await r2Service.getObjectMetadata(key, userId, isAdmin);
    res.json({
      success: true,
      metadata: meta
    });
  } catch (err: any) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// GET /api/r2/download - Presigned download link
r2Router.get('/download', requireAuth, async (req: AuthRequest, res: Response) => {
  const key = (req.query.key || req.body?.key) as string;
  if (!key) {
    res.status(400).json({ success: false, message: 'Khóa tập tin (key) là bắt buộc.' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không thể xác thực danh tính người dùng.' });
    return;
  }

  const isAdmin = checkIsAdmin(req.user);

  try {
    const result = await r2Service.getPresignedDownloadUrl(key, userId, isAdmin);
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// DELETE /api/r2/file - Delete file from R2 (Strict namespace check)
r2Router.delete('/file', requireAuth, async (req: AuthRequest, res: Response) => {
  const key = (req.body.key || req.query.key) as string;
  if (!key) {
    res.status(400).json({ success: false, message: 'Khóa tập tin (key) là bắt buộc.' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không thể xác thực danh tính người dùng.' });
    return;
  }

  const isAdmin = checkIsAdmin(req.user);

  try {
    await r2Service.deleteFile(key, userId, isAdmin);
    res.json({
      success: true,
      message: `Đã xóa tập tin "${key}" khỏi Cloudflare R2.`
    });
  } catch (err: any) {
    res.status(403).json({ success: false, message: err.message });
  }
});
