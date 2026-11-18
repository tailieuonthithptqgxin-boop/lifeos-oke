import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { classroomService, ClassroomError } from '../services/classroom.service.js';

export const classroomRouter = Router();

function handleError(res: Response, err: any) {
  if (err instanceof ClassroomError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
      error: { code: err.code, message: err.message }
    });
  }
  console.error('[ClassroomRouter] Unexpected error:', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: err?.message || 'Đã xảy ra lỗi máy chủ trong phòng học trực tuyến.',
    error: { code: 'INTERNAL_ERROR', message: err?.message || 'Lỗi hệ thống' }
  });
}

// Helper to get request origin dynamically
function getDynamicOrigin(req: any): string {
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`.replace(/\/$/, '');
}

// -------------------------------------------------------------
// Google Calendar / Meet OAuth Endpoints
// -------------------------------------------------------------

// 1. Connection status
classroomRouter.get('/google/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const origin = getDynamicOrigin(req);
    const status = await classroomService.getGoogleStatus(req.userId!, origin);
    res.json({ success: true, ...status });
  } catch (err) {
    handleError(res, err);
  }
});

// 2. Generate authorization URL
classroomRouter.get('/google/auth-url', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const origin = getDynamicOrigin(req);
    const url = classroomService.buildAuthUrl(req.userId!, origin);
    const redirectUri = classroomService.getClassroomRedirectUri(origin);
    res.json({ success: true, url, redirectUri });
  } catch (err) {
    handleError(res, err);
  }
});

// 3. OAuth Callback handler (Google redirects browser here)
classroomRouter.get('/google/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  const errorParam = String(req.query.error || '');

  if (errorParam) {
    return res.redirect(`/?view=classroom&google_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return res.redirect(`/?view=classroom&google_error=${encodeURIComponent('Thiếu mã xác thực từ Google')}`);
  }

  try {
    const origin = getDynamicOrigin(req);
    const redirectUri = classroomService.getClassroomRedirectUri(origin);
    const { email } = await classroomService.handleCallback(code, state, redirectUri);
    res.redirect(`/?view=classroom&google=connected&email=${encodeURIComponent(email)}`);
  } catch (err: any) {
    const msg = err instanceof ClassroomError ? err.message : (err?.message || 'Kết nối Google thất bại');
    res.redirect(`/?view=classroom&google_error=${encodeURIComponent(msg)}`);
  }
});

// 4. Disconnect Google
classroomRouter.delete('/google', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await classroomService.disconnectGoogle(req.userId!);
    res.json({ success: true, message: 'Đã ngắt kết nối tài khoản Google.', ...result });
  } catch (err) {
    handleError(res, err);
  }
});

// -------------------------------------------------------------
// Online Class Management
// -------------------------------------------------------------

// List classes
classroomRouter.get('/classes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scope = (req.query.scope === 'history' ? 'history' : 'upcoming') as 'upcoming' | 'history';
    const classes = await classroomService.listClasses(req.userId!, scope);
    res.json({ success: true, classes });
  } catch (err) {
    handleError(res, err);
  }
});

// Create new class (creates real Google Meet via Calendar API if selected)
classroomRouter.post('/classes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const created = await classroomService.createClass(req.userId!, req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo phòng học trực tuyến thành công!',
      class: created
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Update class
classroomRouter.patch('/classes/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await classroomService.updateClass(req.userId!, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Cập nhật thông tin lớp học thành công.',
      class: updated
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Cancel class
classroomRouter.delete('/classes/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cancelled = await classroomService.cancelClass(req.userId!, req.params.id);
    res.json({
      success: true,
      message: 'Đã hủy lớp học.',
      class: cancelled
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Create preparation task inside LifeOS Task management
classroomRouter.post('/classes/:id/prep-task', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const task = await classroomService.createPrepTask(req.userId!, req.params.id);
    res.json({
      success: true,
      message: `Đã tạo nhiệm vụ "${task.title}" vào mục Công việc của bạn!`,
      task
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Record completed study session from Classroom Timer
classroomRouter.post('/classes/:id/record-session', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const durationMinutes = Number(req.body.durationMinutes) || 0;
    const notes = req.body.notes;
    const result = await classroomService.recordStudySession(req.userId!, req.params.id, durationMinutes, notes);
    res.json({
      success: true,
      message: `Đã ghi nhận ${result.recordedMinutes} phút học vào hồ sơ của bạn!`,
      ...result
    });
  } catch (err) {
    handleError(res, err);
  }
});
