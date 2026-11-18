import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { petService } from '../services/pet.service.js';

export const petRouter = Router();

// 1. Get pet state
petRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pet = await petService.getPet(req.userId!);
    res.json({ success: true, pet });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Không thể tải thông tin thú cưng' });
  }
});

// 2. Feed pet
petRouter.post('/feed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await petService.feed(req.userId!);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Không thể cho thú cưng ăn' });
  }
});

// 3. Pet / Cuddle pet
petRouter.post('/pet', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await petService.pet(req.userId!);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Lỗi tương tác' });
  }
});

// 4. Rename pet
petRouter.post('/rename', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const pet = await petService.rename(req.userId!, name);
    res.json({ success: true, pet });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Không thể đổi tên' });
  }
});

// 5. Customize pet (switch type or skin)
petRouter.post('/customize', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, skin } = req.body;
    const pet = await petService.customize(req.userId!, type, skin);
    res.json({ success: true, pet });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Không thể tùy chỉnh' });
  }
});
