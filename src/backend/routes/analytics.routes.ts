import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../auth.middleware';
import { productAnalyticsService } from '../services/analytics.service';
import { studySpaceService } from '../services/studySpace.service';
import jwt from 'jsonwebtoken';

export const analyticsRouter = Router();

// Lấy secret JWT từ biến môi trường hoặc fallback chuẩn
const JWT_SECRET = process.env.JWT_SECRET || 'lifeos-jwt-secret-key-production-2026';

/**
 * 1. Thu thập dữ liệu theo dõi ngầm dạng Batch (Tối ưu cho gói Free)
 * Cho phép gửi kể cả khi chưa đăng nhập hoặc đã đăng nhập (lấy token mềm nếu có)
 */
analyticsRouter.post('/track-batch', async (req: AuthRequest, res: Response) => {
  try {
    let userId: string | null = req.userId || null;

    // Nếu middleware chưa gán userId, thử giải mã nhẹ từ Header hoặc Cookie
    if (!userId) {
      const authHeader = req.headers.authorization;
      const token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.split(' ')[1]
        : (req.cookies?.token || null);

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded && decoded.id) {
            userId = decoded.id;
          }
        } catch {
          // Token không hợp lệ thì ghi nhận ẩn danh
        }
      }
    }

    const events = req.body?.events || [];
    await productAnalyticsService.recordBatch(userId, events);

    res.json({ success: true });
  } catch (error: any) {
    console.warn('Analytics batch ingestion error:', error?.message);
    res.json({ success: true }); // Trả về 200 để không chặn luồng client
  }
});

/**
 * 2. Tab 1: Bảng Phân Tích Chức Năng & Dịch Vụ
 */
analyticsRouter.get('/admin/features', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await productAnalyticsService.getFeatureAnalyticsOverview();
    res.json({
      success: true,
      ...data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Không thể tải bảng phân tích chức năng.'
    });
  }
});

/**
 * 3. Tab 2: Danh Sách Quản Lý Người Dùng & Trạng Thái Hoạt Động
 */
analyticsRouter.get('/admin/users', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, filter, page, limit } = req.query;
    const result = await productAnalyticsService.getUserActivityList({
      search: typeof search === 'string' ? search : undefined,
      filter: typeof filter === 'string' ? filter : undefined,
      page: typeof page === 'string' ? parseInt(page, 10) : 1,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : 25
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Không thể tải danh sách người dùng.'
    });
  }
});

/**
 * 4. Tính năng "Hồ Sơ X-Quang Người Dùng" (Chi tiết cá nhân)
 */
analyticsRouter.get('/admin/users/:id/xray', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const profile = await productAnalyticsService.getUserXRayProfile(userId);
    res.json({
      success: true,
      profile
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error?.message || 'Không thể tải hồ sơ X-Quang người dùng.'
    });
  }
});

/**
 * 5. Cập nhật ghi chú riêng của Admin về khách này
 */
analyticsRouter.put('/admin/users/:id/notes', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { notes } = req.body;
    await productAnalyticsService.updateAdminNotes(userId, String(notes || ''));
    res.json({
      success: true,
      message: 'Đã lưu ghi chú quản trị thành công!'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Không thể lưu ghi chú.'
    });
  }
});

/**
 * 6. Nâng cấp / Hạ cấp gói dịch vụ nhanh
 */
analyticsRouter.put('/admin/users/:id/plan', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { plan } = req.body;
    await productAnalyticsService.updateUserPlan(userId, String(plan || ''));
    res.json({
      success: true,
      message: `Đã cập nhật gói dịch vụ thành ${plan}!`
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Không thể cập nhật gói dịch vụ.'
    });
  }
});

/**
 * 7. Khóa / Mở khóa tài khoản nhanh
 */
analyticsRouter.put('/admin/users/:id/status', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;
    await productAnalyticsService.toggleUserStatus(userId, String(status || ''));
    res.json({
      success: true,
      message: status === 'BANNED' ? 'Đã khóa tài khoản thành công.' : 'Đã mở khóa tài khoản hoạt động bình thường.'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || 'Không thể cập nhật trạng thái tài khoản.'
    });
  }
});

/**
 * 8. Phân tích Phòng Học Ảo (Virtual Study Rooms) dành cho Admin
 */
analyticsRouter.get('/admin/study-rooms', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await studySpaceService.getStudyRoomsAnalytics();
    res.json({ success: true, analytics });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Lỗi khi tải số liệu phân tích phòng học.'
    });
  }
});
