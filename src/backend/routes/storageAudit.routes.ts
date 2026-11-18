import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { storageAuditService, CleanupTarget } from '../services/storageAudit.service.js';

export const storageAuditRouter = Router();

// Middleware to ensure user is ADMIN or SUPERADMIN
function requireAdminRole(req: AuthRequest, res: Response, next: any) {
  const role = (req.user?.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập khu vực kiểm toán hệ thống và lưu trữ (Yêu cầu quyền Admin).'
    });
  }
  next();
}

// 1. GET /api/admin/storage-audit/overview
storageAuditRouter.get('/overview', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const overview = await storageAuditService.getStorageOverview();
    res.json({
      success: true,
      data: overview
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/admin/storage-audit/orphans
storageAuditRouter.get('/orphans', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const report = await storageAuditService.scanOrphanRecords();
    res.json({
      success: true,
      data: report
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/admin/storage-audit/r2-orphans
storageAuditRouter.get('/r2-orphans', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const report = await storageAuditService.scanR2OrphanFiles();
    res.json({
      success: true,
      data: report
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. GET /api/admin/storage-audit/cleanup-history
storageAuditRouter.get('/cleanup-history', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const history = await storageAuditService.getCleanupHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/admin/storage-audit/backup/trigger
storageAuditRouter.post('/backup/trigger', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const result = await storageAuditService.triggerBackup(
      req.user?.id || req.userId || 'admin',
      req.user?.email || 'Admin'
    );
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/admin/storage-audit/cleanup
storageAuditRouter.post('/cleanup', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  const { target, dryRun } = req.body;

  if (!target) {
    return res.status(400).json({ success: false, message: 'Thiếu tham số target.' });
  }

  const validTargets: CleanupTarget[] = [
    'expired_idempotency_keys',
    'expired_sessions',
    'expired_reset_tokens',
    'old_sent_emails',
    'purge_sent_email_bodies',
    'old_read_notifications',
    'old_soft_deleted'
  ];

  if (!validTargets.includes(target as CleanupTarget)) {
    return res.status(400).json({ 
      success: false, 
      message: `Target không hợp lệ hoặc dữ liệu được bảo vệ. Các mục hợp lệ: ${validTargets.join(', ')}` 
    });
  }

  try {
    const result = await storageAuditService.executeSafeCleanup({
      target: target as CleanupTarget,
      dryRun: Boolean(dryRun),
      adminUserId: req.user?.id || req.userId || 'admin',
      adminEmail: req.user?.email || 'admin'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. GET /api/admin/storage-audit/breakdown - Real-time breakdown by 4 categories
storageAuditRouter.get('/breakdown', requireAuth, requireAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await storageAuditService.getStorageBreakdown();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. POST /api/admin/storage-audit/smart-clean - 1-Click safe cleanup
storageAuditRouter.post('/smart-clean', requireAuth, requireAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await storageAuditService.executeSmartClean();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. GET /api/admin/storage-audit/export-csv - Users & commissions CSV (UTF-8 BOM for Excel)
storageAuditRouter.get('/export-csv', requireAuth, requireAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const csvContent = await storageAuditService.exportUsersCommissionsCsv();
    const fileName = `bao-cao-nguoi-dung-hoa-hong-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. GET /api/admin/storage-audit/backup-json - Full JSON backup
storageAuditRouter.get('/backup-json', requireAuth, requireAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const backupData = await storageAuditService.getFullSystemBackup();
    const fileName = `backup-lifeos-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. POST /api/admin/storage-audit/restore-json - Restore from JSON backup
storageAuditRouter.post('/restore-json', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const result = await storageAuditService.restoreFromSystemBackup(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 12. GET & POST /api/admin/storage-audit/auto-protection - Auto-protection toggles
storageAuditRouter.get('/auto-protection', requireAuth, requireAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const config = await storageAuditService.getAutoProtectionConfig();
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

storageAuditRouter.post('/auto-protection', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const saved = await storageAuditService.saveAutoProtectionConfig(req.body);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. POST /api/admin/storage-audit/clean-category - Clean specific safe category
storageAuditRouter.post('/clean-category', requireAuth, requireAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryKey } = req.body;
    const result = await storageAuditService.cleanSpecificCategory(categoryKey);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
