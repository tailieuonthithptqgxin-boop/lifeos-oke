import fs from 'fs';

let content = fs.readFileSync('src/backend/routes/api.ts', 'utf8');

const routesToAdd = `
// 13. Public/User: Get active published announcements & login alerts
apiRouter.get('/announcements/active', async (req: AuthRequest, res: Response) => {
  try {
    const list = await announcementService.getActiveAnnouncements(req.userId);
    res.json({ success: true, announcements: list });
  } catch (err: any) {
    console.error('GET /announcements/active error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 14. User: Acknowledge announcement (Mark as read / do not pop up again)
apiRouter.post('/announcements/:id/acknowledge', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await announcementService.acknowledgeAnnouncement(req.params.id, req.userId!);
    res.json(result);
  } catch (err: any) {
    console.error('POST /announcements/:id/acknowledge error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 15. User: Track CTA button click
apiRouter.post('/announcements/:id/click', async (req: AuthRequest, res: Response) => {
  try {
    const result = await announcementService.trackClick(req.params.id, req.userId);
    res.json(result);
  } catch (err: any) {
    console.error('POST /announcements/:id/click error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 16. Admin: Toggle Pin / Unpin
apiRouter.post('/admin/announcements/:id/toggle-pin', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminUser = {
      id: req.userId!,
      name: req.user?.name || req.user?.email || 'Administrator'
    };
    const result = await announcementService.togglePin(req.params.id, adminUser);
    res.json(result);
  } catch (err: any) {
    console.error('POST /admin/announcements/:id/toggle-pin error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 17. Admin: Remind unread recipients
apiRouter.post('/admin/announcements/:id/remind-unread', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminUser = {
      id: req.userId!,
      name: req.user?.name || req.user?.email || 'Administrator'
    };
    const result = await announcementService.remindUnread(req.params.id, adminUser);
    res.json(result);
  } catch (err: any) {
    console.error('POST /admin/announcements/:id/remind-unread error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 18. Admin: Get Read Receipts
apiRouter.get('/admin/announcements/:id/receipts', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await announcementService.getReadReceipts(req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error('GET /admin/announcements/:id/receipts error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 19. Admin: Preview HTML Email
apiRouter.post('/admin/announcements/preview-email', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { buildAdminBroadcastGmailHTML } = await import('../services/broadcastEmailTemplate.service.js');
    const html = buildAdminBroadcastGmailHTML({
      title: req.body.title || 'Tiêu đề thông báo mẫu',
      message: req.body.message || 'Nội dung thông báo mẫu gửi từ Quản trị viên LifeOS...',
      type: req.body.type || 'GENERAL',
      priority: req.body.priority || 'NORMAL',
      imageUrl: req.body.imageUrl || null,
      actionLabel: req.body.actionLabel || 'Xem trên LifeOS',
      actionUrl: req.body.actionUrl || 'https://quanlicanhan.online',
      recipientName: req.user?.name || 'Nguyễn Văn A',
      recipientEmail: req.user?.email || 'user@example.com'
    });
    res.json({ success: true, html });
  } catch (err: any) {
    console.error('POST /admin/announcements/preview-email error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 20. Admin: WordPress REST API / SMTP Bridge Management
apiRouter.get('/admin/wordpress/config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { wordPressBridgeService } = await import('../services/wordpressBridge.service.js');
    const config = await wordPressBridgeService.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    console.error('GET /admin/wordpress/config error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.post('/admin/wordpress/config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { wordPressBridgeService } = await import('../services/wordpressBridge.service.js');
    await wordPressBridgeService.saveConfig(req.body);
    res.json({ success: true, message: 'Đã lưu cấu hình kết nối WordPress.' });
  } catch (err: any) {
    console.error('POST /admin/wordpress/config error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

apiRouter.post('/admin/wordpress/test', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { wordPressBridgeService } = await import('../services/wordpressBridge.service.js');
    const result = await wordPressBridgeService.testConnection(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('POST /admin/wordpress/test error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});
`;

if (!content.includes('/announcements/active')) {
  content = content + '\n' + routesToAdd;
  fs.writeFileSync('src/backend/routes/api.ts', content, 'utf8');
  console.log('Successfully appended routes to api.ts');
} else {
  console.log('Routes already present in api.ts');
}
